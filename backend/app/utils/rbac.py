"""
Role-Based Access Control (RBAC)
Decorators and utilities for permission checking
"""

import logging
from functools import wraps
from typing import List, Callable, Any
from fastapi import HTTPException, status, Depends
from app.identity_vault.models import UserRole

logger = logging.getLogger(__name__)


class PermissionLevel:
    """Permission level constants"""
    ADMIN = 3
    TECHNICIAN = 2
    AGENT = 1


class PermissionChecker:
    """Utility class for permission checking"""
    
    PERMISSION_MAP = {
        UserRole.ADMIN.value: {
            "create_users": True,
            "view_all_data": True,
            "view_missions": True,
            "fix_issues": True,
            "upload_evidence": True,
            "manage_facilities": True,
            "access_knowledge_base": True,
            "view_identity_logs": True,
            "manage_all_users": True,
        },
        UserRole.TECHNICIAN.value: {
            "create_users": False,
            "view_all_data": False,
            "view_missions": True,
            "fix_issues": True,
            "upload_evidence": False,
            "manage_facilities": False,
            "access_knowledge_base": True,
            "view_identity_logs": False,
            "manage_all_users": False,
        },
        UserRole.AGENT.value: {
            "create_users": False,
            "view_all_data": False,
            "view_missions": True,
            "fix_issues": False,
            "upload_evidence": True,
            "manage_facilities": False,
            "access_knowledge_base": True,
            "view_identity_logs": False,
            "manage_all_users": False,
        }
    }
    
    @staticmethod
    def check_permission(user: dict, permission: str) -> bool:
        """
        Check if user has specific permission
        
        Args:
            user: User document
            permission: Permission to check
            
        Returns:
            True if user has permission, False otherwise
        """
        user_role = user.get("role")
        permissions = PermissionChecker.PERMISSION_MAP.get(user_role, {})
        return permissions.get(permission, False)
    
    @staticmethod
    def check_permissions(user: dict, permissions: List[str], require_all: bool = True) -> bool:
        """
        Check if user has multiple permissions
        
        Args:
            user: User document
            permissions: List of permissions to check
            require_all: If True, user must have all permissions.
                        If False, user must have at least one.
            
        Returns:
            True if user has required permissions
        """
        if require_all:
            return all(PermissionChecker.check_permission(user, p) for p in permissions)
        else:
            return any(PermissionChecker.check_permission(user, p) for p in permissions)
    
def require_permissions(permissions: List[str], require_all: bool = True):
    """
    Decorator to require specific permissions for an endpoint
    
    Args:
        permissions: List of required permissions
        require_all: If True, user must have all permissions. If False, at least one.
        
    Usage:
        @app.get("/admin/users")
        @require_permissions(["manage_all_users"], require_all=True)
        async def get_all_users(current_user: dict = Depends(get_current_user)):
            ...
    """
    async def permission_checker(current_user: dict):
        if not PermissionChecker.check_permissions(current_user, permissions, require_all):
            logger.warning(
                f"Access denied for user {current_user.get('email')}. "
                f"Required permissions: {permissions}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(permissions)}"
            )
        return current_user
    
    return permission_checker


def require_role(required_roles: List[str]):
    """
    Factory function to create role-checking dependency
    
    Args:
        required_roles: List of required roles
        
    Usage:
        @app.get("/admin/dashboard")
        async def admin_dashboard(current_user: dict = Depends(require_role(["admin"]))):
            ...
            
        @app.get("/ranger/missions")
        async def ranger_missions(current_user: dict = Depends(require_role(["technician", "agent"]))):
            ...
    """
    async def role_checker(current_user: dict):
        user_role = current_user.get("role")
        
        if user_role not in required_roles:
            logger.warning(
                f"Unauthorized role access attempt by {current_user.get('email')}. "
                f"User role: {user_role}, Required: {required_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}"
            )
        
        return current_user
    
    return role_checker


def check_ranger_access(current_user: dict) -> bool:
    """
    Check if user is a ranger (technician or agent)
    
    Args:
        current_user: User document
        
    Returns:
        True if user is a ranger
    """
    return current_user.get("role") in [UserRole.TECHNICIAN.value, UserRole.AGENT.value]


def require_ranger_role():
    """
    Dependency to require ranger role (technician or agent)
    
    Usage:
        @app.get("/ranger/dashboard")
        async def ranger_dashboard(current_user: dict = Depends(require_ranger_role())):
            ...
    """
    async def ranger_role_checker(current_user: dict):
        if not check_ranger_access(current_user):
            logger.warning(
                f"Ranger access denied for user {current_user.get('email')}. "
                f"User role: {current_user.get('role')}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ranger access required (technician or agent)"
            )
        return current_user
    
    return ranger_role_checker


# Export commonly used functions
__all__ = [
    'PermissionChecker',
    'require_permissions',
    'require_role',
    'require_ranger_role',
    'check_ranger_access',
    'PermissionLevel'
]
