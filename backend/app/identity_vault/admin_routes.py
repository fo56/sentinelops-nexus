"""
Admin Routes
Routes for admin to manage users, create rangers, view logs, etc.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

from app.database.mongodb import get_database
from app.utils.dependencies import get_current_admin
from .models import (
    AdminCreateUserRequest, AdminCreateUserResponse,
    UserResponse, IdentityLogResponse
)
from .services import UserService, generate_login_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin Management"])


@router.post("/create-user", response_model=AdminCreateUserResponse)
async def create_ranger_user(
    request: AdminCreateUserRequest,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
     ADMIN CREATE RANGER USER
    Admin endpoint to create a new ranger user (Technician or Agent)
    
    Process:
    1. Admin fills in ranger details (name, email, password, role, etc.)
    2. System creates user account with ACTIVE status
    3. Login token is generated that includes:
       - User ID
       - Email
       - Expiration time (default 30 days from creation)
    
    After this, the Ranger can:
    - Use email + password to login via /auth/ranger/login
    - Use token to login via /auth/token-login
    
    Args:
        request: User creation request with details
        current_admin: Current logged-in admin (via dependency)
        db: MongoDB database
        
    Returns:
        Created user info with:
        - user_id
        - email
        - full_name
        - role (technician or agent)
        - token (for frontend to display)
        - message
    """
    try:
        # Create user
        user = await UserService.create_user(
            db=db,
            full_name=request.full_name,
            email=request.email,
            password=request.password,
            age=request.age,
            marital_status=request.marital_status.value,
            criminal_record=request.criminal_record,
            role=request.role.value,
            health_issues=request.health_issues
        )
        
        # Generate token
        token = generate_login_token(
            str(user["_id"]),
            request.email
        )
        
        # Set token expiration (default 30 days)
        token_expires_at = datetime.utcnow() + timedelta(days=30)
        
        # Save token to user with expiration
        collection = db["users"]
        await collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "token": token,
                    "token_expires_at": token_expires_at,
                    "token_created_at": datetime.utcnow()
                }
            }
        )
        
        # Log admin action
        logger.info(
            f" Admin {current_admin['email']} created new ranger: {request.email} "
            f"(Role: {request.role.value}) | Token expires: {token_expires_at}"
        )
        
        return AdminCreateUserResponse(
            user_id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            token=token,
            message=f" Successfully created ranger: {request.full_name} | "
                    f"Token valid for 30 days | Rangers can now login with email/password or token"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating ranger: {e}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating ranger user: {str(e)}"
        )


@router.get("/users", response_model=List[dict])
async def get_all_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Get all users (admin only)
    
    Args:
        role: Filter by role (optional)
        status: Filter by status (optional)
        current_admin: Current logged-in admin
        db: MongoDB database
        
    Returns:
        List of all users
    """
    try:
        collection = db["users"]
        
        # Build filter query
        query = {}
        if role:
            query["role"] = role
        if status:
            query["status"] = status
        
        users = await collection.find(query).to_list(length=None)
        
        # Convert to response dicts with id field
        response_users = []
        for user in users:
            response_dict = {
                "id": str(user["_id"]),  # Explicitly map _id to id
                "email": user.get("email", ""),
                "full_name": user.get("full_name", "Unknown"),
                "age": user.get("age", 0),
                "marital_status": user.get("marital_status", "single"),
                "role": user.get("role", "technician"),
                "status": user.get("status", "active"),
                "criminal_record": user.get("criminal_record", False),
                "health_issues": user.get("health_issues", False),
                "created_at": user.get("created_at"),
                "last_login": user.get("last_login"),
                "token": user.get("token")
            }
            response_users.append(response_dict)
        
        logger.info(f"Fetched {len(response_users)} users")
        if response_users:
            logger.info(f"First user: {response_users[0]}")
        
        return response_users
    
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching users"
        )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Get a specific user by ID
    
    Args:
        user_id: User's MongoDB ID
        current_admin: Current logged-in admin
        db: MongoDB database
        
    Returns:
        User details
    """
    try:
        user = await UserService.get_user_by_id(db, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return await UserService.user_to_response(user)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching user"
        )


@router.get("/identity-logs", response_model=List[IdentityLogResponse])
async def get_identity_logs(
    user_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Get identity logs (login/logout/failed attempts)
    
    Args:
        user_id: Filter by specific user (optional)
        limit: Number of logs to return
        current_admin: Current logged-in admin
        db: MongoDB database
        
    Returns:
        List of identity logs
    """
    try:
        logs = await UserService.get_identity_logs(db, user_id, limit)
        
        # Convert to response models
        response_logs = []
        for log in logs:
            response_logs.append(IdentityLogResponse(
                _id=str(log["_id"]),
                user_id=log["user_id"],
                email=log["email"],
                login_time=log["login_time"],
                logout_time=log.get("logout_time"),
                device_info=log.get("device_info"),
                ip_address=log.get("ip_address"),
                status=log["status"],
                reason=log.get("reason")
            ))
        
        return response_logs
    
    except Exception as e:
        logger.error(f"Error fetching identity logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching identity logs"
        )


@router.put("/users/{user_id}")
async def update_user_status(
    user_id: str,
    request: dict,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Update user status (activate/suspend)
    
    Args:
        user_id: User's MongoDB ID
        request: Request body with status field
        current_admin: Current logged-in admin
        db: MongoDB database
        
    Returns:
        Success message
    """
    try:
        collection = db["users"]
        
        # Get the new status from request
        new_status = request.get("status")
        
        if not new_status or new_status not in ["active", "suspended"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be 'active' or 'suspended'"
            )
        
        result = await collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": new_status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        action_emoji = "" if new_status == "active" else ""
        action_word = "activated" if new_status == "active" else "suspended"
        
        logger.info(f"{action_emoji} Admin {current_admin['email']} {action_word} user: {user_id}")
        
        return {"message": f"User {user_id} has been {action_word}"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user status"
        )


@router.put("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Suspend a user account (legacy endpoint)
    
    Args:
        user_id: User's MongoDB ID
        current_admin: Current logged-in admin
        db: MongoDB database
        
    Returns:
        Success message
    """
    try:
        collection = db["users"]
        
        result = await collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "suspended"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f" Admin {current_admin['email']} suspended user: {user_id}")
        
        return {"message": f"User {user_id} has been suspended"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suspending user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error suspending user"
        )


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Activate a suspended user
    
    Args:
        user_id: User's MongoDB ID
        current_admin: Current logged-in admin
        db: MongoDB database
        
    Returns:
        Success message
    """
    try:
        collection = db["users"]
        
        result = await collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "active"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f" Admin {current_admin['email']} activated user: {user_id}")
        
        return {"message": f"User {user_id} has been activated"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error activating user"
        )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_database)
):
    """
    Delete a user permanently
    
    Args:
        user_id: User's MongoDB ID
        current_admin: Current logged-in admin
        db: MongoDB database
        
    Returns:
        Success message
    """
    try:
        collection = db["users"]
        
        # First, check if the user exists and get their info
        user = await collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admin from deleting themselves
        if str(user["_id"]) == str(current_admin["_id"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own admin account"
            )
        
        # Delete the user
        result = await collection.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(
            f"  Admin {current_admin['email']} deleted user: {user.get('email', user_id)} "
            f"(Role: {user.get('role', 'unknown')})"
        )
        
        return {
            "message": f"User {user.get('full_name', user_id)} has been permanently deleted",
            "deleted_user_id": user_id,
            "deleted_user_email": user.get("email")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )
