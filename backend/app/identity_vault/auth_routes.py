"""
Authentication Routes
Routes for login, token validation, and user info
Includes ranger login (email + password)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from typing import Optional
from datetime import timedelta

from app.database.mongodb import get_database
from app.utils.auth import create_access_token, decode_access_token
from app.utils.dependencies import get_current_user
from .models import (
    LoginRequest, TokenResponse,
    UserMe, IdentityLogResponse,
    RangerLoginRequest, TokenLoginRequest
)
from .services import UserService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])



def get_client_ip(request: Request) -> str:
    """
    Get client IP address from request
    Handles X-Forwarded-For header for proxies and load balancers
    """
    if request.client:
        # Check for X-Forwarded-For header (proxy/load balancer)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in case of multiple proxies
            return forwarded_for.split(",")[0].strip()
        return request.client.host
    return "unknown"


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    user_agent: Optional[str] = Header(None),
    db = Depends(get_database)
):
    """
    Unified Login endpoint for all users (Admins, Rangers, Technicians)
    """
    try:
        import time
        t0 = time.time()
        client_ip = get_client_ip(http_request)
        device_info = user_agent or "Unknown Device"
        t1 = time.time()
        
        # Authenticate user
        user = await UserService.authenticate_user(db, request.email, request.password)
        t2 = time.time()
        
        if not user:
            # Log failed attempt
            await UserService.log_identity_event(
                db,
                user_id="unknown",
                email=request.email,
                status="failed_attempt",
                device_info=device_info,
                ip_address=client_ip,
                reason="Invalid email or password"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        t3 = time.time()
        # Log successful login
        await UserService.log_identity_event(
            db,
            user_id=str(user["_id"]),
            email=user["email"],
            status="login",
            device_info=device_info,
            ip_address=client_ip
        )
        t4 = time.time()
        
        # Create access token
        from app.config.settings import settings
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "role": user["role"], "user_id": str(user["_id"])},
            expires_delta=access_token_expires
        )
        t5 = time.time()
        print(f"IP: {t1-t0}, AUTH: {t2-t1}, LOG: {t4-t3}, TOKEN: {t5-t4}, TOTAL: {t5-t0}")

        
        logger.info(f" User logged in: {request.email} (Role: {user['role']})")
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/token-login", response_model=TokenResponse)
async def token_login(
    request: TokenLoginRequest,
    user_agent: Optional[str] = Header(None),
    db = Depends(get_database)
):
    """
    Login using a text token
    
    Args:
        request: TokenLoginRequest with token
        user_agent: User agent from request header
        db: MongoDB database
        
    Returns:
        JWT token and user information
    """
    try:
        # Find user with this token
        collection = db["users"]
        user = await collection.find_one({"token": request.token})
        
        if not user:
            logger.warning(f"Invalid token attempted: {request.token}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        if user["status"] != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not active"
            )
        
        # Update last login
        await UserService.update_last_login(db, str(user["_id"]))
        
        # Log successful login
        await UserService.log_identity_event(
            db,
            user_id=str(user["_id"]),
            email=user["email"],
            status="logged_in",
            device_info=user_agent,
            reason="Token login"
        )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=60)
        access_token = create_access_token(
            data={"sub": user["email"]},
            expires_delta=access_token_expires
        )
        
        logger.info(f" User logged in via token: {user['email']}")
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token login failed"
        )


@router.get("/validate", response_model=dict)
async def validate_token(
    token: str,
    db = Depends(get_database)
):
    """
    Validate if a token is still valid
    
    Args:
        token: JWT token to validate
        db: MongoDB database
        
    Returns:
        Validation status and user info
    """
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        
        user = await UserService.get_user_by_email(db, email)
        
        if not user or user["status"] != "active":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        return {
            "valid": True,
            "user_id": str(user["_id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.get("/me", response_model=UserMe)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get current logged-in user's information
    
    Args:
        current_user: Current user from token (via dependency)
        db: MongoDB database
        
    Returns:
        Current user's details with permissions
    """
    try:
        user = await UserService.get_user_by_email(db, current_user["email"])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return await UserService.user_to_me_response(user)
    
    except Exception as e:
        logger.error(f"Error fetching current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching user information"
        )
