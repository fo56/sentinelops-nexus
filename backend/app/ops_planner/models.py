"""
Ops Planner Models
Mission Board with Kanban, Agent Assignment, Scoring System
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId
from enum import Enum



# ============================================
# ENUMS
# ============================================

class MissionStatus(str, Enum):
    """Mission status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ABORTED = "aborted"


class MissionDifficulty(str, Enum):
    """Mission difficulty levels"""
    SEARCH = "search"
    HARD = "hard"
    INSANE = "insane"


class AgentAvailability(str, Enum):
    """Agent availability status"""
    FREE = "free"
    BUSY = "busy"
    UNAVAILABLE = "unavailable"


# ============================================
# MISSION MODELS
# ============================================

class MissionCreate(BaseModel):
    """Create new mission - Admin only"""
    title: str = Field(..., min_length=3, max_length=200, description="Mission title")
    description: Optional[str] = Field(None, max_length=2000, description="Mission description")
    difficulty: MissionDifficulty = Field(..., description="Mission difficulty: search, hard, insane")
    due_date: Optional[datetime] = Field(None, description="Mission deadline")
    tags: List[str] = Field(default_factory=list, description="Mission tags")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Secure Facility Alpha",
                "description": "Complete security sweep of Facility Alpha",
                "difficulty": "hard",
                "due_date": "2025-12-15T18:00:00",
                "tags": ["security", "facility", "urgent"]
            }
        }


class MissionAssign(BaseModel):
    """Assign mission to an agent"""
    agent_id: str = Field(..., description="Agent user ID to assign")
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent_id": "507f1f77bcf86cd799439011"
            }
        }


class MissionStatusUpdate(BaseModel):
    """Update mission status - Admin or Assigned Agent only"""
    status: MissionStatus = Field(..., description="New mission status")
    completion_notes: Optional[str] = Field(None, description="Notes about completion/failure")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "completed",
                "completion_notes": "All objectives achieved successfully"
            }
        }


class MissionUpdate(BaseModel):
    """Update mission details - Admin only"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    difficulty: Optional[MissionDifficulty] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None


class MissionDocumentInfo(BaseModel):
    """Mission document information"""
    filename: str
    upload_date: datetime
    uploaded_by: str
    file_size: int
    file_path: str


class MissionResponse(BaseModel):
    """Mission response model"""
    id: str = Field(..., alias="_id")
    title: str
    description: Optional[str] = None
    difficulty: str
    status: str
    created_by: str
    created_by_name: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    assigned_agent_name: Optional[str] = None
    assigned_agent_score: Optional[int] = None
    previous_assigned_agent_id: Optional[str] = None  # Track agent who previously failed this mission
    due_date: Optional[datetime] = None
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    documents: List[MissionDocumentInfo] = []
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat() if v else None}


class MissionCardResponse(BaseModel):
    """Mission card for Kanban board view"""
    id: str = Field(..., alias="_id")
    title: str
    difficulty: str
    status: str
    assigned_agent_id: Optional[str] = None
    assigned_agent_name: Optional[str] = None
    due_date: Optional[datetime] = None
    tags: List[str]
    created_at: datetime
    document_count: int = 0
    
    class Config:
        populate_by_name = True


# ============================================
# AGENT MODELS
# ============================================

class AgentScoreInfo(BaseModel):
    """Agent information with score for assignment selection"""
    id: str = Field(..., alias="_id")
    full_name: str
    email: str
    score: int
    availability: str
    active_missions: int = Field(default=0)
    completed_missions: int = Field(default=0)
    failed_missions: int = Field(default=0)
    
    class Config:
        populate_by_name = True


class AgentWorkResponse(BaseModel):
    """Agent's work dashboard - assigned and completed missions"""
    assigned_missions: List[MissionResponse]
    completed_missions: List[MissionResponse]
    failed_missions: List[MissionResponse]
    current_score: int
    total_missions: int


# ============================================
# KANBAN BOARD MODELS
# ============================================

class KanbanColumn(BaseModel):
    """Kanban board column"""
    status: str
    title: str
    missions: List[MissionCardResponse]
    count: int


class KanbanBoardResponse(BaseModel):
    """Complete Kanban board view"""
    columns: List[KanbanColumn]
    total_missions: int
    stats: dict
    
    class Config:
        json_schema_extra = {
            "example": {
                "columns": [
                    {
                        "status": "pending",
                        "title": "Pending",
                        "missions": [],
                        "count": 5
                    },
                    {
                        "status": "in_progress",
                        "title": "In Progress",
                        "missions": [],
                        "count": 3
                    },
                    {
                        "status": "completed",
                        "title": "Completed",
                        "missions": [],
                        "count": 7
                    },
                    {
                        "status": "failed",
                        "title": "Failed",
                        "missions": [],
                        "count": 1
                    }
                ],
                "total_missions": 16,
                "stats": {
                    "pending": 5,
                    "in_progress": 3,
                    "completed": 7,
                    "failed": 1,
                    "success_rate": 87.5
                }
            }
        }


# ============================================
# DOCUMENT UPLOAD MODELS
# ============================================

class DocumentUploadResponse(BaseModel):
    """Response after document upload"""
    filename: str
    file_path: str
    upload_date: datetime
    uploaded_by: str
    file_size: int
    message: str


# ============================================
# ACTIVITY LOG MODELS
# ============================================

class ActivityLog(BaseModel):
    """Activity log entry"""
    mission_id: str
    action: str
    description: str
    user: str
    user_name: Optional[str] = None
    timestamp: datetime
    details: Optional[dict] = None


class ActivityLogResponse(BaseModel):
    """Activity log response"""
    id: str = Field(..., alias="_id")
    mission_id: str
    action: str
    description: str
    user: str
    user_name: Optional[str] = None
    timestamp: datetime
    details: Optional[dict] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}


# ============================================
# WEBSOCKET MODELS
# ============================================

class WebSocketMessage(BaseModel):
    """WebSocket message format for real-time updates"""
    type: str = Field(..., description="Message type: mission_created, mission_assigned, mission_moved, mission_updated, mission_completed")
    mission_id: str
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "mission_moved",
                "mission_id": "507f1f77bcf86cd799439011",
                "data": {
                    "from_status": "pending",
                    "to_status": "in_progress",
                    "assigned_agent": "John Doe"
                },
                "timestamp": "2025-12-07T10:30:00",
                "user": "admin"
            }
        }
