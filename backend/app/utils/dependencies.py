"""
FastAPI Dependencies
Authentication middleware and RBAC
"""

import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.utils.auth import decode_access_token
from app.database.mongodb import get_database
from app.identity_vault.models import UserRole

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer token from request
        
    Returns:
        User document from database
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        email = payload.get("sub")
        
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    db = get_database()
    user = await db["users"].find_one({"email": email})
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or suspended",
        )
    
    logger.debug(f"Current user authenticated: {email}")
    return user


async def get_current_admin(
    current_user: dict = Depends(get_current_user)
):
    """
    Require admin role for endpoint access
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User if admin, raises exception otherwise
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        logger.warning(f"Unauthorized admin access attempt by: {current_user.get('email')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_role(required_role: str):
    """
    Factory function to create role-checking dependency
    
    Args:
        required_role: Required role string
        
    Returns:
        Dependency function
    """
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        
        # Role hierarchy: admin > technician > agent
        role_hierarchy = {
            UserRole.ADMIN.value: 3,
            UserRole.TECHNICIAN.value: 2,
            UserRole.AGENT.value: 1
        }
        
        user_level = role_hierarchy.get(user_role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        if user_level < required_level:
            logger.warning(f"Insufficient permissions for user: {current_user.get('email')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        
        return current_user
    
    return role_checker


# Alias for compatibility with other modules
get_db = get_database
