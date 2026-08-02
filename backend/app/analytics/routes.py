"""
Analytics Routes
Analytics API Endpoints
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.analytics.models import (
    AnalyticsReport, TimeRange, AnomalyAlert, LoginAnalytics,
    UserActivityAnalytics, DocumentAnalytics, SecurityAnalytics
)
from app.analytics.services import AnalyticsService
from app.utils.dependencies import get_current_user, require_role
from app.database.mongodb import get_database
from typing import List

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])
logger = logging.getLogger(__name__)


async def get_analytics_service(db=Depends(get_database)) -> AnalyticsService:
    """Dependency to get analytics service"""
    return AnalyticsService(db)


@router.get("/report", response_model=AnalyticsReport)
async def get_analytics_report(
    time_range: TimeRange = TimeRange.LAST_7D,
    current_user: dict = Depends(require_role('admin')),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get comprehensive analytics report
    Requires admin or manager role
    """
    try:
        report = await analytics_service.generate_full_report(time_range)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )


@router.get("/login", response_model=LoginAnalytics)
async def get_login_analytics(
    time_range: TimeRange = TimeRange.LAST_7D,
    current_user: dict = Depends(require_role('admin')),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get login statistics"""
    try:
        analytics = await analytics_service.get_login_analytics(time_range)
        return analytics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get login analytics: {str(e)}"
        )


@router.get("/users", response_model=UserActivityAnalytics)
async def get_user_analytics(
    time_range: TimeRange = TimeRange.LAST_7D,
    current_user: dict = Depends(require_role('admin')),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get user activity statistics"""
    try:
        analytics = await analytics_service.get_user_activity_analytics(time_range)
        return analytics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user analytics: {str(e)}"
        )


@router.get("/documents", response_model=DocumentAnalytics)
async def get_document_analytics(
    time_range: TimeRange = TimeRange.LAST_7D,
    current_user: dict = Depends(require_role('admin')),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get document operation statistics"""
    try:
        analytics = await analytics_service.get_document_analytics(time_range)
        return analytics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document analytics: {str(e)}"
        )


@router.get("/security", response_model=SecurityAnalytics)
async def get_security_analytics(
    time_range: TimeRange = TimeRange.LAST_7D,
    current_user: dict = Depends(require_role('admin')),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get security event statistics"""
    try:
        analytics = await analytics_service.get_security_analytics(time_range)
        return analytics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security analytics: {str(e)}"
        )


@router.get("/anomalies", response_model=List[AnomalyAlert])
async def detect_anomalies(
    current_user: dict = Depends(require_role('admin')),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Detect and get system anomalies"""
    try:
        alerts = await analytics_service.detect_anomalies()
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect anomalies: {str(e)}"
        )


@router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: dict = Depends(require_role('admin')),
    db = Depends(get_database)
):
    """
    Get real-time dashboard statistics
    
    Returns:
        - active_agents: Count of active agents
        - active_technicians: Count of active technicians
        - open_missions: Count of pending missions
        - in_progress_missions: Count of in-progress missions
        - completed_missions: Count of completed missions
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
