"""
Ops Planner Services
Mission Management, Agent Assignment, Scoring, Document Upload
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status, UploadFile
import os
import logging

from .models import (
    MissionCreate, MissionAssign, MissionStatusUpdate, MissionUpdate,
    MissionResponse, MissionCardResponse, MissionDocumentInfo,
    AgentScoreInfo, AgentWorkResponse,
    KanbanColumn, KanbanBoardResponse,
    ActivityLog, ActivityLogResponse,
    MissionStatus, AgentAvailability,
    DocumentUploadResponse
)

logger = logging.getLogger(__name__)


class MissionService:
    """Mission management service"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.missions_collection = db.missions
        self.users_collection = db.users
        self.activity_collection = db.mission_activity

    # ============================================
    # MISSION CRUD OPERATIONS
    # ============================================

    async def create_mission(self, mission_data: MissionCreate, created_by: str) -> MissionResponse:
        """
        Create new mission (Admin only)
        Mission starts in PENDING status
        """
        # Get admin user info for activity log
        admin = await self.users_collection.find_one({"email": created_by})

        mission_doc = {
            "title": mission_data.title,
            "description": mission_data.description,
            "difficulty": mission_data.difficulty.value,
            "status": MissionStatus.PENDING.value,
            "created_by": created_by,
            "created_by_name": admin.get("full_name", "Admin"),
            "assigned_agent_id": None,
            "assigned_agent_name": None,
            "assigned_agent_score": None,
            "previous_assigned_agent_id": None,
            "due_date": mission_data.due_date,
            "tags": mission_data.tags,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "completed_at": None,
            "completion_notes": None,
            "documents": []
        }

        result = await self.missions_collection.insert_one(mission_doc)
        mission_doc["_id"] = str(result.inserted_id)

        # Log activity
        await self._log_activity(
            mission_id=str(result.inserted_id),
            action="mission_created",
            description=f"Mission '{mission_data.title}' created",
            user=created_by,
            user_name=admin.get("full_name", "Admin")
        )

        logger.info(f" Mission created: {mission_data.title} by {created_by}")
        return MissionResponse(**mission_doc)

    async def get_mission(self, mission_id: str) -> Optional[MissionResponse]:
        """Get single mission by ID"""
        try:
            mission_obj_id = ObjectId(mission_id)
            mission = await self.missions_collection.find_one({"_id": mission_obj_id})
            if not mission:
                return None
            
            mission["_id"] = str(mission["_id"])
            return MissionResponse(**mission)
        except Exception as e:
            logger.error(f"Error fetching mission: {e}")
            return None

    async def get_all_missions(
        self,
        status: Optional[str] = None,
        difficulty: Optional[str] = None,
        assigned_agent_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[MissionResponse]:
        """Get all missions with filters"""
        query = {}
        
        if status:
            query["status"] = status
        if difficulty:
            query["difficulty"] = difficulty
        if assigned_agent_id:
            query["assigned_agent_id"] = assigned_agent_id

        missions = []
        cursor = self.missions_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        async for mission in cursor:
            mission["_id"] = str(mission["_id"])
            missions.append(MissionResponse(**mission))

        return missions

    async def update_mission(
        self, 
        mission_id: str, 
        mission_update: MissionUpdate, 
        updated_by: str
    ) -> MissionResponse:
        """
        Update mission details (Admin only)
        """
        # Get admin user info for activity log
        admin = await self.users_collection.find_one({"email": updated_by})

        # Validate mission_id format
        try:
            mission_obj_id = ObjectId(mission_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mission ID format: {str(e)}"
            )

        # Get existing mission
        mission = await self.missions_collection.find_one({"_id": mission_obj_id})
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mission not found"
            )

        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}
        
        if mission_update.title:
            update_doc["title"] = mission_update.title
        if mission_update.description is not None:
            update_doc["description"] = mission_update.description
        if mission_update.difficulty:
            update_doc["difficulty"] = mission_update.difficulty.value
        if mission_update.due_date is not None:
            update_doc["due_date"] = mission_update.due_date
        if mission_update.tags is not None:
            update_doc["tags"] = mission_update.tags

        # Update mission
        await self.missions_collection.update_one(
            {"_id": mission_obj_id},
            {"$set": update_doc}
        )

        # Log activity
        await self._log_activity(
            mission_id=mission_id,
            action="mission_updated",
            description=f"Mission updated",
            user=updated_by,
            user_name=admin.get("full_name", "Admin")
        )

        # Return updated mission
        return await self.get_mission(mission_id)

    async def delete_mission(self, mission_id: str, deleted_by: str) -> dict:
        """
        Delete/Abort mission (Admin only)
        """
        # Get admin user info for activity log
        admin = await self.users_collection.find_one({"email": deleted_by})

        # Validate mission_id format
        try:
            mission_obj_id = ObjectId(mission_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mission ID format: {str(e)}"
            )

        # Get mission
        mission = await self.missions_collection.find_one({"_id": mission_obj_id})
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mission not found"
            )

        # If mission is assigned, free up the agent
        if mission.get("assigned_agent_id"):
            await self._update_agent_availability(mission["assigned_agent_id"], "free", -1)

        # Mark as aborted instead of deleting
        await self.missions_collection.update_one(
            {"_id": mission_obj_id},
            {"$set": {
                "status": MissionStatus.ABORTED.value,
                "updated_at": datetime.utcnow()
            }}
        )

        # Log activity
        await self._log_activity(
            mission_id=mission_id,
            action="mission_aborted",
            description=f"Mission aborted/deleted",
            user=deleted_by,
            user_name=admin.get("full_name", "Admin")
        )

        logger.info(f" Mission aborted: {mission_id} by {deleted_by}")
        return {"message": "Mission aborted successfully", "mission_id": mission_id}

    # ============================================
    # MISSION ASSIGNMENT & STATUS
    # ============================================

    async def assign_mission_to_agent(
        self, 
        mission_id: str, 
        assignment: MissionAssign, 
        assigned_by: str
    ) -> MissionResponse:
        """
        Assign mission to an agent (Admin only)
        Mission moves from PENDING to IN_PROGRESS
        """
        # Get admin user info for activity log
        admin = await self.users_collection.find_one({"email": assigned_by})

        # Validate mission_id format
        try:
            mission_obj_id = ObjectId(mission_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mission ID format: {str(e)}"
            )

        # Get mission
        mission = await self.missions_collection.find_one({"_id": mission_obj_id})
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mission not found"
            )

        # Check if mission is already assigned
        if mission.get("assigned_agent_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mission is already assigned to an agent"
            )
        
        # Check if agent was previously assigned and failed this mission
        if mission.get("previous_assigned_agent_id") == assignment.agent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This agent previously failed this mission and cannot be reassigned to it"
            )

        # Validate agent_id format
        try:
            agent_obj_id = ObjectId(assignment.agent_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid agent ID format. Must be a 24-character hex string. Error: {str(e)}"
            )

        # Get agent
        agent = await self.users_collection.find_one({"_id": agent_obj_id})
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        # Verify agent role
        if agent.get("role") != "agent":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not an agent"
            )

        # Check agent availability
        if agent.get("availability") != "free":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent is not available. Current status: {agent.get('availability')}"
            )

        # Update mission
        await self.missions_collection.update_one(
            {"_id": mission_obj_id},
            {"$set": {
                "assigned_agent_id": assignment.agent_id,
                "assigned_agent_name": agent.get("full_name"),
                "assigned_agent_score": agent.get("score", 100),
                "status": MissionStatus.IN_PROGRESS.value,
                "updated_at": datetime.utcnow()
            }}
        )

        # Update agent availability and active missions
        await self._update_agent_availability(assignment.agent_id, "busy", 1)

        # Log activity
        await self._log_activity(
            mission_id=mission_id,
            action="mission_assigned",
            description=f"Mission assigned to {agent.get('full_name')}",
            user=assigned_by,
            user_name=admin.get("full_name", "Admin"),
            details={"agent_id": assignment.agent_id, "agent_name": agent.get("full_name")}
        )

        logger.info(f" Mission {mission_id} assigned to agent {assignment.agent_id}")
        return await self.get_mission(mission_id)

    async def update_mission_status(
        self,
        mission_id: str,
        status_update: MissionStatusUpdate,
        updated_by: str,
        user_role: str
    ) -> MissionResponse:
        """
        Update mission status
        Admin: Can update any mission
        Agent: Can only update their assigned missions
        """
        # Validate mission_id format
        try:
            mission_obj_id = ObjectId(mission_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mission ID format: {str(e)}"
            )

        # Get mission
        mission = await self.missions_collection.find_one({"_id": mission_obj_id})
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mission not found"
            )

        # Permission check
        user = await self.users_collection.find_one({"email": updated_by})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # If not admin, check if user is the assigned agent
        if user_role != "admin":
            if str(user["_id"]) != mission.get("assigned_agent_id"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update missions assigned to you"
                )

        # Update mission status
        update_doc = {
            "status": status_update.status.value,
            "updated_at": datetime.utcnow()
        }

        if status_update.completion_notes:
            update_doc["completion_notes"] = status_update.completion_notes

        # If completing or failing, set completion time and update agent score
        if status_update.status in [MissionStatus.COMPLETED, MissionStatus.FAILED]:
            update_doc["completed_at"] = datetime.utcnow()
            
            # Update agent score and stats
            if mission.get("assigned_agent_id"):
                agent_id = mission["assigned_agent_id"]
                score_change = 50 if status_update.status == MissionStatus.COMPLETED else -25
                
                await self._update_agent_score(agent_id, score_change, status_update.status.value)
                await self._update_agent_availability(agent_id, "free", -1)
            
            # If mission failed, reset it to pending for reassignment (excluding previous agent)
            if status_update.status == MissionStatus.FAILED:
                update_doc["status"] = MissionStatus.PENDING.value
                update_doc["previous_assigned_agent_id"] = mission.get("assigned_agent_id")
                update_doc["assigned_agent_id"] = None
                update_doc["assigned_agent_name"] = None
                update_doc["assigned_agent_score"] = None
                update_doc["completed_at"] = None  # Clear completion time for pending state

        await self.missions_collection.update_one(
            {"_id": mission_obj_id},
            {"$set": update_doc}
        )

        # Log activity
        await self._log_activity(
            mission_id=mission_id,
            action=f"mission_{status_update.status.value}",
            description=f"Mission status changed to {status_update.status.value}",
            user=updated_by,
            user_name=user.get("full_name", "User")
        )

        logger.info(f" Mission {mission_id} status updated to {status_update.status.value}")
        return await self.get_mission(mission_id)

    # ============================================
    # KANBAN BOARD VIEW
    # ============================================

    async def get_kanban_board(self) -> KanbanBoardResponse:
        """
        Get complete Kanban board view with all missions organized by status
        """
        columns = []
        total_missions = 0
        stats = {
            "pending": 0,
            "in_progress": 0,
            "completed": 0,
            "failed": 0,
            "aborted": 0,
            "success_rate": 0.0
        }

        # Define columns
        column_configs = [
            {"status": "pending", "title": "Pending"},
            {"status": "in_progress", "title": "In Progress"},
            {"status": "completed", "title": "Completed"},
            {"status": "failed", "title": "Failed"}
        ]

        for config in column_configs:
            missions = []
            cursor = self.missions_collection.find(
                {"status": config["status"]}
            ).sort("created_at", -1)

            async for mission in cursor:
                mission["_id"] = str(mission["_id"])
                mission["document_count"] = len(mission.get("documents", []))
                missions.append(MissionCardResponse(**mission))
                stats[config["status"]] += 1
                total_missions += 1

            columns.append(KanbanColumn(
                status=config["status"],
                title=config["title"],
                missions=missions,
                count=len(missions)
            ))

        # Calculate success rate
        total_completed_or_failed = stats["completed"] + stats["failed"]
        if total_completed_or_failed > 0:
            stats["success_rate"] = round((stats["completed"] / total_completed_or_failed) * 100, 2)

        return KanbanBoardResponse(
            columns=columns,
            total_missions=total_missions,
            stats=stats
        )

    # ============================================
    # AGENT MANAGEMENT
    # ============================================

    async def get_available_agents(self) -> List[AgentScoreInfo]:
        """
        Get list of available agents sorted by score (descending)
        Only shows FREE agents
        """
        agents = []
        cursor = self.users_collection.find({
            "role": "agent",
            "availability": "free",
            "status": "active"
        }).sort("score", -1)

        async for agent in cursor:
            agent["_id"] = str(agent["_id"])
            agents.append(AgentScoreInfo(**agent))

        return agents

    async def get_agent_work(self, agent_id: str) -> AgentWorkResponse:
        """
        Get agent's work dashboard - "My Work" section
        Shows assigned, completed, and failed missions
        """
        # Validate agent_id format
        try:
            agent_obj_id = ObjectId(agent_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid agent ID format: {str(e)}"
            )

        # Get agent
        agent = await self.users_collection.find_one({"_id": agent_obj_id})
        if not agent or agent.get("role") != "agent":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        # Get assigned missions (in progress)
        assigned_missions = []
        cursor = self.missions_collection.find({
            "assigned_agent_id": agent_id,
            "status": MissionStatus.IN_PROGRESS.value
        }).sort("created_at", -1)
        
        async for mission in cursor:
            mission["_id"] = str(mission["_id"])
            assigned_missions.append(MissionResponse(**mission))

        # Get completed missions
        completed_missions = []
        cursor = self.missions_collection.find({
            "assigned_agent_id": agent_id,
            "status": MissionStatus.COMPLETED.value
        }).sort("completed_at", -1).limit(10)
        
        async for mission in cursor:
            mission["_id"] = str(mission["_id"])
            completed_missions.append(MissionResponse(**mission))

        # Get failed missions (missions that were failed by this agent and are now pending)
        failed_missions = []
        cursor = self.missions_collection.find({
            "previous_assigned_agent_id": agent_id,
            "status": MissionStatus.PENDING.value
        }).sort("updated_at", -1).limit(10)
        
        async for mission in cursor:
            mission["_id"] = str(mission["_id"])
            failed_missions.append(MissionResponse(**mission))

        total_missions = len(assigned_missions) + agent.get("completed_missions", 0) + agent.get("failed_missions", 0)

        return AgentWorkResponse(
            assigned_missions=assigned_missions,
            completed_missions=completed_missions,
            failed_missions=failed_missions,
            current_score=agent.get("score", 100),
            total_missions=total_missions
        )

    # ============================================
    # DOCUMENT MANAGEMENT
    # ============================================

    async def upload_mission_document(
        self,
        mission_id: str,
        file: UploadFile,
        uploaded_by: str,
        user_role: str
    ) -> DocumentUploadResponse:
        """
        Upload document to mission
        Only assigned agent can upload documents
        """
        # Validate mission_id format
        try:
            mission_obj_id = ObjectId(mission_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mission ID format: {str(e)}"
            )

        # Get mission
        mission = await self.missions_collection.find_one({"_id": mission_obj_id})
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mission not found"
            )

        # Get user
        user = await self.users_collection.find_one({"email": uploaded_by})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Permission check - only assigned agent or admin can upload
        if user_role != "admin" and str(user["_id"]) != mission.get("assigned_agent_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned agent can upload documents to this mission"
            )

        # Create uploads directory if it doesn't exist
        upload_dir = "uploads/missions"
        os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{mission_id}_{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Create document info
        doc_info = {
            "filename": file.filename,
            "upload_date": datetime.utcnow(),
            "uploaded_by": uploaded_by,
            "file_size": len(content),
            "file_path": file_path
        }

        # Add to mission documents
        await self.missions_collection.update_one(
            {"_id": mission_obj_id},
            {"$push": {"documents": doc_info}}
        )

        # Log activity
        await self._log_activity(
            mission_id=mission_id,
            action="document_uploaded",
            description=f"Document '{file.filename}' uploaded",
            user=uploaded_by,
            user_name=user.get("full_name", "User")
        )

        logger.info(f" Document uploaded to mission {mission_id}: {file.filename}")
        
        return DocumentUploadResponse(
            filename=file.filename,
            file_path=file_path,
            upload_date=doc_info["upload_date"],
            uploaded_by=uploaded_by,
            file_size=len(content),
            message="Document uploaded successfully"
        )

    async def get_mission_documents(self, mission_id: str, user_id: str, user_role: str) -> List[MissionDocumentInfo]:
        """
        Get mission documents
        Only assigned agent or admin can view documents
        """
        # Validate mission_id format
        try:
            mission_obj_id = ObjectId(mission_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mission ID format: {str(e)}"
            )

        # Get mission
        mission = await self.missions_collection.find_one({"_id": mission_obj_id})
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mission not found"
            )

        # Permission check
        if user_role != "admin" and user_id != mission.get("assigned_agent_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view these documents"
            )

        documents = []
        for doc in mission.get("documents", []):
            documents.append(MissionDocumentInfo(**doc))

        return documents

    # ============================================
    # ACTIVITY LOG
    # ============================================

    async def get_mission_activity(self, mission_id: str, limit: int = 50) -> List[ActivityLogResponse]:
        """Get activity log for a mission"""
        activities = []
        cursor = self.activity_collection.find(
            {"mission_id": mission_id}
        ).sort("timestamp", -1).limit(limit)

        async for activity in cursor:
            activity["_id"] = str(activity["_id"])
            activities.append(ActivityLogResponse(**activity))

        return activities

    # ============================================
    # HELPER METHODS
    # ============================================

    async def _log_activity(
        self,
        mission_id: str,
        action: str,
        description: str,
        user: str,
        user_name: Optional[str] = None,
        details: Optional[dict] = None
    ):
        """Log activity for mission"""
        activity_doc = {
            "mission_id": mission_id,
            "action": action,
            "description": description,
            "user": user,
            "user_name": user_name,
            "timestamp": datetime.utcnow(),
            "details": details or {}
        }
        await self.activity_collection.insert_one(activity_doc)

    async def _update_agent_score(self, agent_id: str, score_change: int, mission_status: str):
        """Update agent score and mission counts"""
        update_doc = {
            "$inc": {"score": score_change}
        }

        if mission_status == "completed":
            update_doc["$inc"]["completed_missions"] = 1
        elif mission_status == "failed":
            update_doc["$inc"]["failed_missions"] = 1

        await self.users_collection.update_one(
            {"_id": ObjectId(agent_id)},
            update_doc
        )
        logger.info(f" Agent {agent_id} score updated: {score_change:+d}")

    async def _update_agent_availability(self, agent_id: str, availability: str, active_missions_change: int):
        """Update agent availability and active mission count"""
        await self.users_collection.update_one(
            {"_id": ObjectId(agent_id)},
            {
                "$set": {"availability": availability},
                "$inc": {"active_missions": active_missions_change}
            }
        )
        logger.info(f" Agent {agent_id} availability updated to {availability}")
