"""
Ops Planner Routes
Mission Board API with Kanban, Agent Assignment, Real-time Updates
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import logging

from ..database.mongodb import get_database
from ..utils.dependencies import get_current_user, get_current_admin
from ..utils.auth import decode_access_token
from .services import MissionService
from .websocket import manager
from .models import (
    MissionCreate, MissionAssign, MissionStatusUpdate, MissionUpdate,
    MissionResponse, MissionCardResponse, MissionDocumentInfo,
    AgentScoreInfo, AgentWorkResponse,
    KanbanBoardResponse,
    ActivityLogResponse,
    DocumentUploadResponse,
    MissionStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ops-planner", tags=["Ops Planner (Mission Board)"])


# ============================================
# MISSION CRUD ENDPOINTS
# ============================================

@router.post("/missions", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
async def create_mission(
    mission_data: MissionCreate,
    current_user: dict = Depends(get_current_admin),
    db=Depends(get_database)
):
    """
    **Create new mission (Admin only)**
    
    Mission starts in PENDING status and must be assigned to an agent.
    
    - **title**: Mission title (required)
    - **description**: Detailed mission description
    - **difficulty**: Mission difficulty (search, hard, insane)
    - **due_date**: Mission deadline
    - **tags**: Mission tags for categorization
    
    **Permissions**: Admin only
    """
    service = MissionService(db)
    mission = await service.create_mission(mission_data, current_user["email"])
    
    return mission


@router.get("/missions", response_model=List[MissionResponse])
async def get_all_missions(
    status: Optional[str] = Query(None, description="Filter by status: pending, in_progress, completed, failed"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty: search, hard, insane"),
    assigned_agent_id: Optional[str] = Query(None, description="Filter by assigned agent ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Get all missions with optional filters**
    
    Returns list of missions based on filters and user role.
    
    - **status**: Filter by mission status
    - **difficulty**: Filter by difficulty level
    - **assigned_agent_id**: Filter by assigned agent
    - **skip**: Pagination offset
    - **limit**: Max results per page
    
    **Permissions**: All authenticated users
    """
    service = MissionService(db)
    missions = await service.get_all_missions(
        status=status,
        difficulty=difficulty,
        assigned_agent_id=assigned_agent_id,
        skip=skip,
        limit=limit
    )
    return missions


@router.get("/missions/{mission_id}", response_model=MissionResponse)
async def get_mission(
    mission_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Get single mission by ID**
    
    Returns detailed information about a specific mission.
    
    **Permissions**: All authenticated users
    """
    service = MissionService(db)
    mission = await service.get_mission(mission_id)
    
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission not found"
        )
    
    return mission


@router.patch("/missions/{mission_id}", response_model=MissionResponse)
async def update_mission(
    mission_id: str,
    mission_update: MissionUpdate,
    current_user: dict = Depends(get_current_admin),
    db=Depends(get_database)
):
    """
    **Update mission details (Admin only)**
    
    Update mission title, description, difficulty, due date, or tags.
    
    **Permissions**: Admin only
    """
    service = MissionService(db)
    mission = await service.update_mission(mission_id, mission_update, current_user["email"])
    
    return mission


@router.delete("/missions/{mission_id}")
async def delete_mission(
    mission_id: str,
    current_user: dict = Depends(get_current_admin),
    db=Depends(get_database)
):
    """
    **Delete/Abort mission (Admin only)**
    
    Marks mission as ABORTED and frees up assigned agent.
    
    **Permissions**: Admin only
    """
    service = MissionService(db)
    result = await service.delete_mission(mission_id, current_user["email"])
    
    return result


# ============================================
# MISSION ASSIGNMENT & STATUS
# ============================================

@router.post("/missions/{mission_id}/assign", response_model=MissionResponse)
async def assign_mission_to_agent(
    mission_id: str,
    assignment: MissionAssign,
    current_user: dict = Depends(get_current_admin),
    db=Depends(get_database)
):
    """
    **Assign mission to an agent (Admin only)**
    
    Assigns a mission to a FREE agent. Mission automatically moves from PENDING to IN_PROGRESS.
    Agent availability is updated to BUSY.
    
    - **agent_id**: ID of the agent to assign
    
    **Requirements**:
    - Mission must be in PENDING status
    - Agent must have role "agent"
    - Agent must be FREE (not assigned to any mission)
    
    **Permissions**: Admin only
    """
    service = MissionService(db)
    mission = await service.assign_mission_to_agent(mission_id, assignment, current_user["email"])
    
    return mission


@router.patch("/missions/{mission_id}/status", response_model=MissionResponse)
async def update_mission_status(
    mission_id: str,
    status_update: MissionStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Update mission status**
    
    Update mission status to completed, failed, etc.
    
    - **status**: New status (pending, in_progress, completed, failed)
    - **completion_notes**: Optional notes about completion or failure
    
    **Scoring System**:
    - COMPLETED: Agent gets +50 points
    - FAILED: Agent gets -25 points
    
    Agent availability is automatically set to FREE when mission is completed or failed.
    
    **Permissions**: 
    - Admin: Can update any mission
    - Agent: Can only update missions assigned to them
    """
    service = MissionService(db)
    mission = await service.update_mission_status(
        mission_id, 
        status_update, 
        current_user["email"],
        current_user["role"]
    )
    
    return mission


# ============================================
# KANBAN BOARD VIEW
# ============================================

@router.get("/board", response_model=KanbanBoardResponse)
async def get_kanban_board(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Get complete Kanban board view**
    
    Returns all missions organized in columns by status:
    - **Pending**: Missions not yet assigned
    - **In Progress**: Missions currently assigned to agents
    - **Completed**: Successfully completed missions
    - **Failed**: Failed missions
    
    Also includes statistics:
    - Total missions per status
    - Success rate percentage
    
    **Use Case**: Display on admin dashboard as mission management board
    
    **Permissions**: All authenticated users (Admin sees all, Agents see only their missions)
    """
    service = MissionService(db)
    board = await service.get_kanban_board()
    return board


# ============================================
# AGENT MANAGEMENT
# ============================================

@router.get("/agents/available", response_model=List[AgentScoreInfo])
async def get_available_agents(
    current_user: dict = Depends(get_current_admin),
    db=Depends(get_database)
):
    """
    **Get list of available agents (Admin only)**
    
    Returns agents who are:
    - Active status
    - FREE availability (not on a mission)
    - Role = "agent"
    
    Agents are sorted by score in descending order (highest score first).
    
    **Use Case**: Admin selecting which agent to assign to a new mission
    
    **Permissions**: Admin only
    """
    service = MissionService(db)
    agents = await service.get_available_agents()
    return agents


@router.get("/agents/{agent_id}/work", response_model=AgentWorkResponse)
async def get_agent_work(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Get agent's work dashboard - "My Work" section**
    
    Returns:
    - **assigned_missions**: Current missions (In Progress)
    - **completed_missions**: Recently completed missions
    - **failed_missions**: Recently failed missions
    - **current_score**: Agent's current score
    - **total_missions**: Total mission count
    
    **Use Case**: Agent dashboard showing "My Work" with current and past missions
    
    **Permissions**: 
    - Agent: Can only view their own work
    - Admin: Can view any agent's work
    """
    # Permission check
    if current_user["role"] != "admin":
        # Agent can only view their own work
        from bson import ObjectId
        user_collection = db.users
        user = await user_collection.find_one({"email": current_user["email"]})
        if str(user["_id"]) != agent_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own work"
            )
    
    service = MissionService(db)
    work = await service.get_agent_work(agent_id)
    return work


@router.get("/my-work", response_model=AgentWorkResponse)
async def get_my_work(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Get current user's work dashboard**
    
    Convenient endpoint for agents to view their own "My Work" section.
    
    **Use Case**: Agent viewing their assigned missions on their dashboard
    
    **Permissions**: Agents only
    """
    if current_user["role"] != "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only agents can view My Work"
        )
    
    # Get user ID
    from bson import ObjectId
    user_collection = db.users
    user = await user_collection.find_one({"email": current_user["email"]})
    agent_id = str(user["_id"])
    
    service = MissionService(db)
    work = await service.get_agent_work(agent_id)
    return work


# ============================================
# DOCUMENT MANAGEMENT
# ============================================

@router.post("/missions/{mission_id}/documents", response_model=DocumentUploadResponse)
async def upload_mission_document(
    mission_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Upload document to mission**
    
    Upload files/documents related to a mission.
    
    **Requirements**:
    - Only the assigned agent can upload documents
    - Files are stored in `uploads/missions/` directory
    - Mission must exist
    
    **Use Case**: Agent uploads evidence, reports, photos during mission
    
    **Permissions**: 
    - Assigned agent only
    - Admin can also upload
    """
    service = MissionService(db)
    result = await service.upload_mission_document(
        mission_id, 
        file, 
        current_user["email"],
        current_user["role"]
    )
    return result


@router.get("/missions/{mission_id}/documents", response_model=List[MissionDocumentInfo])
async def get_mission_documents(
    mission_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Get all documents for a mission**
    
    Returns list of documents uploaded to the mission.
    
    **Permissions**:
    - Assigned agent can view their mission documents
    - Admin can view all documents
    """
    # Get user ID
    from bson import ObjectId
    user_collection = db.users
    user = await user_collection.find_one({"email": current_user["email"]})
    user_id = str(user["_id"])
    
    service = MissionService(db)
    documents = await service.get_mission_documents(
        mission_id, 
        user_id,
        current_user["role"]
    )
    return documents


# ============================================
# ACTIVITY LOG
# ============================================

@router.get("/missions/{mission_id}/activity", response_model=List[ActivityLogResponse])
async def get_mission_activity(
    mission_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    **Get activity log for a mission**
    
    Returns chronological log of all actions performed on the mission:
    - Mission created
    - Mission assigned
    - Status changes
    - Documents uploaded
    - etc.
    
    **Use Case**: Audit trail and mission history
    
    **Permissions**: All authenticated users
    """
    service = MissionService(db)
    activities = await service.get_mission_activity(mission_id, limit)
    return activities


# ============================================
# HEALTH CHECK
# ============================================

@router.get("/health")
async def health_check():
    """Health check endpoint for Ops Planner service"""
    return {
        "status": "healthy",
        "service": "ops-planner",
        "module": "ops_planner",
        "features": [
            "mission_management",
            "agent_assignment",
            "scoring_system",
            "kanban_board",
            "document_upload",
            "activity_logging"
        ]
    }


# ============================================
# STATISTICS
# ============================================

@router.get("/stats")
async def get_stats(
    current_user: dict = Depends(get_current_admin),
    db=Depends(get_database)
):
    """
    **Get overall system statistics**
    
    Returns:
    - Total missions by status
    - Total agents
    - Average agent score
    - Success rate
    
    **Permissions**: Admin only
    """
    
    missions_collection = db.missions
    users_collection = db.users
    
    # Mission stats
    total_missions = await missions_collection.count_documents({})
    pending_missions = await missions_collection.count_documents({"status": MissionStatus.PENDING.value})
    in_progress_missions = await missions_collection.count_documents({"status": MissionStatus.IN_PROGRESS.value})
    completed_missions = await missions_collection.count_documents({"status": MissionStatus.COMPLETED.value})
    failed_missions = await missions_collection.count_documents({"status": MissionStatus.FAILED.value})
    
    # Agent stats
    total_agents = await users_collection.count_documents({"role": "agent"})
    active_agents = await users_collection.count_documents({"role": "agent", "status": "active"})
    
    # Calculate average score
    pipeline = [
        {"$match": {"role": "agent"}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$score"}}}
    ]
    result = await users_collection.aggregate(pipeline).to_list(1)
    avg_score = round(result[0]["avg_score"], 2) if result else 0
    
    # Success rate
    total_completed_or_failed = completed_missions + failed_missions
    success_rate = round((completed_missions / total_completed_or_failed) * 100, 2) if total_completed_or_failed > 0 else 0
    
    return {
        "missions": {
            "total": total_missions,
            "pending": pending_missions,
            "in_progress": in_progress_missions,
            "completed": completed_missions,
            "failed": failed_missions,
            "success_rate": success_rate
        },
        "agents": {
            "total": total_agents,
            "active": active_agents,
            "average_score": avg_score
        }
    }


# ============================================
# WEBSOCKET FOR REAL-TIME UPDATES
# ============================================

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    **WebSocket endpoint for real-time mission updates**
    
    Connect to this endpoint to receive real-time updates about:
    - Mission created
    - Mission assigned to agent
    - Mission status changed (moved between Kanban columns)
    - Mission updated
    - Mission completed/failed
    - Documents uploaded
    
    **Connection**:
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/api/ops-planner/ws?token=YOUR_JWT_TOKEN');
    ```
    
    **Message Format**:
    ```json
    {
        "type": "mission_assigned",
        "mission_id": "507f1f77bcf86cd799439011",
        "data": {
            "agent_name": "John Doe",
            "from_status": "pending",
            "to_status": "in_progress"
        },
        "user": "admin@example.com",
        "timestamp": "2025-12-07T10:30:00"
    }
    ```
    
    **Message Types**:
    - `connection_established`: Connection confirmation
    - `mission_created`: New mission created
    - `mission_assigned`: Mission assigned to agent
    - `mission_moved`: Mission status changed
    - `mission_updated`: Mission details updated
    - `mission_completed`: Mission completed successfully
    - `mission_failed`: Mission failed
    - `document_uploaded`: Document uploaded to mission
    """
    # Authenticate user from token
    if not token:
        await websocket.close(code=1008, reason="Authentication token required")
        return
    
    try:
        # Decode token to get user info
        payload = decode_access_token(token)
        user_email = payload.get("sub")
        
        if not user_email:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Generate client ID
        import uuid
        client_id = f"{user_email}_{uuid.uuid4().hex[:8]}"
        
        # Connect
        await manager.connect(websocket, client_id, {
            "email": user_email,
            "role": payload.get("role", "unknown")
        })
        
        try:
            while True:
                # Receive messages from client
                data = await websocket.receive_json()
                
                # Handle client messages
                message_type = data.get("type")
                
                if message_type == "join_mission":
                    # Client wants to join a specific mission room
                    mission_id = data.get("mission_id")
                    if mission_id:
                        await manager.join_mission_room(client_id, mission_id)
                        await manager.send_personal_message({
                            "type": "joined_mission_room",
                            "mission_id": mission_id,
                            "message": f"Joined mission room: {mission_id}"
                        }, websocket)
                
                elif message_type == "leave_mission":
                    # Client wants to leave a mission room
                    mission_id = data.get("mission_id")
                    if mission_id:
                        await manager.leave_mission_room(client_id, mission_id)
                        await manager.send_personal_message({
                            "type": "left_mission_room",
                            "mission_id": mission_id,
                            "message": f"Left mission room: {mission_id}"
                        }, websocket)
                
                elif message_type == "ping":
                    # Heartbeat/keepalive
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }, websocket)
        
        except WebSocketDisconnect:
            manager.disconnect(client_id)
            logger.info(f"Client disconnected: {client_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason="Internal server error")


@router.get("/ws/info")
async def websocket_info(
    current_user: dict = Depends(get_current_admin)
):
    """
    **Get WebSocket connection information**
    
    Returns information about active WebSocket connections.
    
    **Permissions**: Admin only
    """
    
    return {
        "active_connections": manager.get_active_connections_count(),
        "mission_rooms": manager.get_mission_room_info(),
        "status": "operational"
    }

@router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Get real-time dashboard statistics
    """
    try:
        users_collection = db["users"]
        missions_collection = db["missions"]
        
        # Count active agents
        active_agents = await users_collection.count_documents({
            "role": "agent",
            "status": "active"
        })
        
        # Count active technicians
        active_technicians = await users_collection.count_documents({
            "role": "technician",
            "status": "active"
        })
        
        # Count missions by status
        open_missions = await missions_collection.count_documents({
            "status": "pending"
        })
        
        in_progress_missions = await missions_collection.count_documents({
            "status": "in_progress"
        })
        
        completed_missions = await missions_collection.count_documents({
            "status": "completed"
        })
        
        return {
            "active_agents": active_agents,
            "active_technicians": active_technicians,
            "open_missions": open_missions,
            "in_progress_missions": in_progress_missions,
            "completed_missions": completed_missions
        }
    
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching dashboard statistics"
        )


@router.get("/ranger-stats")
async def get_ranger_stats(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get real-time ranger dashboard statistics
    """
    try:
        user_id = str(current_user["_id"])
        users_collection = db["users"]
        missions_collection = db["missions"]
        issues_collection = db["issues"]
        
        # Get user data for age, marital status, and score
        from bson import ObjectId
        user_data = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        # If user doesn't have score field, initialize it to 100
        if "score" not in user_data:
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"score": 100}}
            )
            user_data["score"] = 100
            logger.info(f"Initialized score for user {user_id}")
        
        # Count completed missions
        completed_missions = await missions_collection.count_documents({
            "assigned_agent_id": user_id,
            "status": "completed"
        })
        
        # Count completed issues (facility_ops uses "assigned_to" field)
        completed_issues = await issues_collection.count_documents({
            "assigned_to": user_id,
            "status": "resolved"
        })
        
        # Get current active issue/mission
        current_mission = await missions_collection.find_one({
            "assigned_agent_id": user_id,
            "status": "in_progress"
        })
        
        current_issue = await issues_collection.find_one({
            "assigned_to": user_id,
            "status": {"$in": ["assigned", "in_progress"]}
        })
        
        # Count in-progress missions
        in_progress_missions = await missions_collection.count_documents({
            "assigned_agent_id": user_id,
            "status": "in_progress"
        })
        
        # Determine current task
        current_task = None
        if current_mission:
            current_task = current_mission.get("title", "Active Mission")
        elif current_issue:
            current_task = current_issue.get("title", "Active Issue")
        
        logger.info(f"Ranger stats for {user_id}: completed_missions={completed_missions}, completed_issues={completed_issues}, score={user_data.get('score', 100)}")
        
        return {
            "completed_issues": completed_issues + completed_missions,
            "current_issue": current_task,
            "performance_score": user_data.get("score", 100),
            "age": user_data.get("age", 0),
            "marital_status": user_data.get("marital_status", "single"),
            "completed_missions": completed_missions,
            "in_progress_missions": in_progress_missions
        }
    
    except Exception as e:
        logger.error(f"Error fetching ranger stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching ranger statistics"
        )
