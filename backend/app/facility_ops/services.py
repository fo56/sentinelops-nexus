"""
Facility Ops Hub Services
Business logic for Issue Tracking System
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
from app.facility_ops.models import (
    IssueCreate, IssueResponse, IssueUpdate, IssueAssign,
    IssueOutcomeSubmit, IssueStatusUpdate, IssueStatus,
    ActivityLog, AISuggestion, IssueOutcome, IssuePriority
)


class FacilityOpsService:
    """Service class for facility operations and issue tracking"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.issues_collection = db.issues
        self.users_collection = db.users
        self.counter_collection = db.counters
    
    async def _get_next_issue_number(self) -> int:
        """Get next sequential issue number"""
        result = await self.counter_collection.find_one_and_update(
            {"_id": "issue_number"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True
        )
        return result["seq"] if result else 1
    
    async def _get_user_info(self, user_id: str) -> Optional[Dict]:
        """Get user information by ID"""
        try:
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            return user
        except:
            return None
    
    async def _add_activity_log(self, issue_id: str, action: str, user_id: str, 
                                user_name: str, details: Optional[str] = None):
        """Add activity log entry to issue"""
        log_entry = ActivityLog(
            action=action,
            performed_by=user_id,
            performed_by_name=user_name,
            details=details
        ).dict()
        
        await self.issues_collection.update_one(
            {"_id": ObjectId(issue_id)},
            {
                "$push": {"activity_log": log_entry},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    async def _update_technician_score(self, technician_id: str, score_change: int):
        """Update technician's score"""
        await self.users_collection.update_one(
            {"_id": ObjectId(technician_id)},
            {"$inc": {"score": score_change}}
        )
    
    async def _generate_ai_suggestions(self, issue: Dict) -> List[Dict]:
        """Generate AI suggestions for issue resolution"""
        # Simple rule-based suggestions for now
        suggestions = []
        
        category = issue.get("category", "")
        priority = issue.get("priority", "")
        
        if category == "cctv":
            suggestions.append({
                "suggestion": "Check camera power supply and network connection. Try rebooting the CCTV router.",
                "confidence": 0.85,
                "generated_at": datetime.utcnow()
            })
        elif category == "door_access":
            suggestions.append({
                "suggestion": "Verify card reader functionality and check access control system logs.",
                "confidence": 0.80,
                "generated_at": datetime.utcnow()
            })
        elif category == "computer":
            suggestions.append({
                "suggestion": "Check power connections, RAM seating, and try safe mode boot.",
                "confidence": 0.75,
                "generated_at": datetime.utcnow()
            })
        elif category == "power_supply":
            suggestions.append({
                "suggestion": "Check circuit breakers, UPS status, and backup generator if available.",
                "confidence": 0.90,
                "generated_at": datetime.utcnow()
            })
        else:
            suggestions.append({
                "suggestion": "Review issue details and consult with senior technician if needed.",
                "confidence": 0.60,
                "generated_at": datetime.utcnow()
            })
        
        # Add priority-based suggestion
        if priority == "high":
            suggestions.append({
                "suggestion": "HIGH PRIORITY: Immediate attention required. Consider escalating if not resolved within 2 hours.",
                "confidence": 0.95,
                "generated_at": datetime.utcnow()
            })
        
        return suggestions
    
    async def create_issue(self, issue_data: IssueCreate, user_id: str, 
                          user_role: str) -> IssueResponse:
        """Create a new issue (by admin or agent)"""
        # Get user info
        user = await self._get_user_info(user_id)
        if not user:
            raise ValueError("User not found")
        
        user_name = user.get("full_name", "Unknown")
        
        # Get next issue number
        issue_number = await self._get_next_issue_number()
        
        # Create issue document
        issue_doc = {
            "issue_number": issue_number,
            "title": issue_data.title,
            "description": issue_data.description,
            "priority": issue_data.priority,
            "category": issue_data.category,
            "location": issue_data.location,
            "status": IssueStatus.PENDING,
            
            # Creator info
            "created_by": user_id,
            "created_by_name": user_name,
            "created_by_role": user_role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            
            # Assignment info (initially None)
            "assigned_to": None,
            "assigned_to_name": None,
            "assigned_at": None,
            "assigned_by": None,
            
            # Completion info
            "completed_at": None,
            "outcome": None,
            "resolution_notes": None,
            
            # Activity log
            "activity_log": [
                ActivityLog(
                    action="Issue created",
                    performed_by=user_id,
                    performed_by_name=user_name,
                    details=f"Priority: {issue_data.priority}, Category: {issue_data.category}"
                ).dict()
            ],
            
            # AI suggestions
            "ai_suggestions": []
        }
        
        # Generate AI suggestions
        issue_doc["ai_suggestions"] = await self._generate_ai_suggestions(issue_doc)
        
        # Insert into database
        result = await self.issues_collection.insert_one(issue_doc)
        issue_doc["_id"] = str(result.inserted_id)
        
        return IssueResponse(**issue_doc)
    
    async def get_all_issues(self, user_role: str, user_id: str, 
                            status: Optional[str] = None, 
                            include_completed: bool = False) -> List[IssueResponse]:
        """Get issues based on user role and permissions"""
        query = {}
        
        # Role-based filtering
        if user_role == "technician":
            # Technicians only see issues assigned to them
            query["assigned_to"] = user_id
        
        # Exclude completed issues by default (show only active issues)
        if not include_completed:
            query["status"] = {"$ne": IssueStatus.COMPLETED}
        
        # Status filtering (overrides default if specified)
        if status:
            query["status"] = status
        
        issues = await self.issues_collection.find(query).sort("created_at", -1).to_list(length=None)
        
        # Convert ObjectId to string
        for issue in issues:
            issue["_id"] = str(issue["_id"])
        
        return [IssueResponse(**issue) for issue in issues]
    
    async def get_issue_by_id(self, issue_id: str, user_role: str, 
                             user_id: str) -> Optional[IssueResponse]:
        """Get single issue by ID with permission check"""
        try:
            issue = await self.issues_collection.find_one({"_id": ObjectId(issue_id)})
            if not issue:
                return None
            
            # Permission check for technicians
            if user_role == "technician" and issue.get("assigned_to") != user_id:
                raise PermissionError("Technicians can only view their assigned issues")
            
            issue["_id"] = str(issue["_id"])
            return IssueResponse(**issue)
        except Exception as e:
            raise e
    
    async def assign_issue(self, issue_id: str, assign_data: IssueAssign, 
                          admin_id: str, admin_name: str) -> IssueResponse:
        """Assign issue to technician (admin only)"""
        # Get current issue to validate
        issue = await self.issues_collection.find_one({"_id": ObjectId(issue_id)})
        if not issue:
            raise ValueError("Issue not found")
        
        # Prevent assigning completed issues (check both enum value and string)
        issue_status = issue.get("status")
        if issue_status == IssueStatus.COMPLETED or issue_status == "completed":
            raise ValueError("Cannot assign a completed issue. Issue is already resolved.")
        
        # Get technician info
        technician = await self._get_user_info(assign_data.technician_id)
        if not technician:
            raise ValueError("Technician not found")
        
        if technician.get("role") != "technician":
            raise ValueError("User is not a technician")
        
        # Check if technician is active
        if technician.get("status") != "active":
            raise ValueError("Technician is not active")
        
        technician_name = technician.get("full_name", "Unknown")
        
        # Update issue
        update_data = {
            "status": IssueStatus.IN_PROGRESS,
            "assigned_to": assign_data.technician_id,
            "assigned_to_name": technician_name,
            "assigned_at": datetime.utcnow(),
            "assigned_by": admin_id,
            "updated_at": datetime.utcnow()
        }
        
        await self.issues_collection.update_one(
            {"_id": ObjectId(issue_id)},
            {"$set": update_data}
        )
        
        # Add activity log
        details = f"Assigned to {technician_name}"
        if assign_data.notes:
            details += f" - Notes: {assign_data.notes}"
        
        await self._add_activity_log(
            issue_id, 
            "Issue assigned", 
            admin_id, 
            admin_name, 
            details
        )
        
        # Return updated issue
        return await self.get_issue_by_id(issue_id, "admin", admin_id)
    
    async def submit_outcome(self, issue_id: str, outcome_data: IssueOutcomeSubmit,
                            technician_id: str, technician_name: str) -> IssueResponse:
        """Technician submits work outcome"""
        # Get current issue
        issue = await self.issues_collection.find_one({"_id": ObjectId(issue_id)})
        if not issue:
            raise ValueError("Issue not found")
        
        # Verify technician is assigned
        if issue.get("assigned_to") != technician_id:
            raise PermissionError("You are not assigned to this issue")
        
        # Update issue based on outcome
        update_data = {
            "outcome": outcome_data.outcome,
            "resolution_notes": outcome_data.notes,
            "updated_at": datetime.utcnow()
        }
        
        # If success, mark as completed
        if outcome_data.outcome == IssueOutcome.SUCCESS:
            update_data["status"] = IssueStatus.COMPLETED
            update_data["completed_at"] = datetime.utcnow()
            
            # Update technician score +50
            await self._update_technician_score(technician_id, 50)
            
        else:  # Failed
            # Issue goes back to pending for reassignment
            update_data["status"] = IssueStatus.PENDING
            update_data["assigned_to"] = None
            update_data["assigned_to_name"] = None
            
            # Update technician score -25
            await self._update_technician_score(technician_id, -25)
        
        await self.issues_collection.update_one(
            {"_id": ObjectId(issue_id)},
            {"$set": update_data}
        )
        
        # Add activity log
        action = "Work completed - Success" if outcome_data.outcome == IssueOutcome.SUCCESS else "Work failed"
        await self._add_activity_log(
            issue_id,
            action,
            technician_id,
            technician_name,
            outcome_data.notes
        )
        
        return await self.get_issue_by_id(issue_id, "technician", technician_id)
    
    async def update_issue_status(self, issue_id: str, status_data: IssueStatusUpdate,
                                 admin_id: str, admin_name: str) -> IssueResponse:
        """Admin updates issue status"""
        update_data = {
            "status": status_data.status,
            "updated_at": datetime.utcnow()
        }
        
        # If marking as completed
        if status_data.status == IssueStatus.COMPLETED:
            update_data["completed_at"] = datetime.utcnow()
        
        # If moving back to pending, clear assignment
        if status_data.status == IssueStatus.PENDING:
            update_data["assigned_to"] = None
            update_data["assigned_to_name"] = None
        
        await self.issues_collection.update_one(
            {"_id": ObjectId(issue_id)},
            {"$set": update_data}
        )
        
        # Add activity log
        details = f"Status changed to {status_data.status}"
        if status_data.notes:
            details += f" - {status_data.notes}"
        
        await self._add_activity_log(
            issue_id,
            "Status updated",
            admin_id,
            admin_name,
            details
        )
        
        return await self.get_issue_by_id(issue_id, "admin", admin_id)
    
    async def delete_issue(self, issue_id: str, admin_id: str) -> bool:
        """Delete an issue (admin only)"""
        try:
            result = await self.issues_collection.delete_one({"_id": ObjectId(issue_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting issue {issue_id}: {str(e)}")
            raise Exception(f"Failed to delete issue: {str(e)}")
    
    async def get_available_technicians(self) -> List[Dict]:
        """Get list of active technicians with their scores"""
        technicians = await self.users_collection.find({
            "role": "technician",
            "status": "active"
        }).to_list(length=None)
        
        result = []
        for tech in technicians:
            # Initialize score if not present
            if "score" not in tech:
                await self.users_collection.update_one(
                    {"_id": tech["_id"]},
                    {"$set": {"score": 100}}
                )
                tech["score"] = 100
            
            result.append({
                "id": str(tech["_id"]),
                "name": tech.get("full_name", "Unknown"),
                "score": tech.get("score", 100),
                "status": tech.get("status", "active")
            })
        
        # Sort by score descending
        result.sort(key=lambda x: x["score"], reverse=True)
        return result
    
    async def get_solved_issues(self, user_role: str, user_id: str) -> List[IssueResponse]:
        """Get all solved/completed issues"""
        query = {"status": IssueStatus.COMPLETED}
        
        # Role-based filtering
        if user_role == "technician":
            # Technicians only see completed issues they worked on
            query["assigned_to"] = user_id
        
        issues = await self.issues_collection.find(query).sort("completed_at", -1).to_list(length=None)
        
        # Convert ObjectId to string
        for issue in issues:
            issue["_id"] = str(issue["_id"])
        
        return [IssueResponse(**issue) for issue in issues]
    
    async def get_issue_stats(self) -> Dict:
        """Get statistics for dashboard"""
        total = await self.issues_collection.count_documents({})
        pending = await self.issues_collection.count_documents({"status": IssueStatus.PENDING})
        in_progress = await self.issues_collection.count_documents({"status": IssueStatus.IN_PROGRESS})
        completed = await self.issues_collection.count_documents({"status": IssueStatus.COMPLETED})
        
        # Get issues by priority
        high_priority = await self.issues_collection.count_documents({
            "priority": IssuePriority.HIGH,
            "status": {"$ne": IssueStatus.COMPLETED}
        })
        
        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "high_priority_open": high_priority
        }
