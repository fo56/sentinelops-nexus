"""
Authentication Routes
Routes for login, QR scanning, token validation, and user info
Includes ranger login (email + password) and QR code scanning
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from typing import Optional
from datetime import timedelta

from app.database.mongodb import get_database
from app.utils.auth import create_access_token, decode_access_token
from app.utils.dependencies import get_current_user
from .models import (
    LoginRequest, TokenResponse, ScanQRRequest,
    QRTokenResponse, UserMe, IdentityLogResponse,
    RangerLoginRequest, QRLoginRequest
)
from .services import UserService
from .qr_service import generate_qr_with_token

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
    user_agent: Optional[str] = Header(None),
    db = Depends(get_database)
):
    """
    Login with email and password
    
    Args:
        request: LoginRequest with email and password
        user_agent: User agent from request header
        db: MongoDB database
        
    Returns:
        JWT token and user information
    """
    try:

        
        # Authenticate user
        user = await UserService.authenticate_user(db, request.email, request.password)
        
        if not user:
            # Log failed attempt
            await UserService.log_identity_event(
                db,
                user_id="unknown",
                email=request.email,
                status="failed_attempt",
                device_info=user_agent,
                reason="Invalid email or password"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login
        await UserService.update_last_login(db, str(user["_id"]))
        
        # Log successful login
        await UserService.log_identity_event(
            db,
            user_id=str(user["_id"]),
            email=user["email"],
            status="logged_in",
            device_info=user_agent
        )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=60)
        access_token = create_access_token(
            data={"sub": user["email"]},
            expires_delta=access_token_expires
        )
        
        logger.info(f"✅ User logged in: {request.email}")
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/ranger/login", response_model=TokenResponse)
async def ranger_login(
    request: RangerLoginRequest,
    http_request: Request,
    user_agent: Optional[str] = Header(None),
    db = Depends(get_database)
):
    """
    ⭐ RANGER LOGIN - Phase 2 Implementation
    Ranger login with email and password (after admin has created them)
    
    This endpoint allows rangers (technicians/agents) to login by providing:
    - Email address
    - Password
    
    The system verifies:
    ✔ User exists in the system
    ✔ Password is correct
    ✔ User role is technician or agent (not admin)
    ✔ User account is active
    
    On successful login:
    - JWT token is generated
    - Session is created
    - Login is logged with device/IP info
    - Role and permissions are attached to the token
    
    Args:
        request: RangerLoginRequest with email and password
        http_request: HTTP request for IP extraction
        user_agent: User agent from request header
        db: MongoDB database
        
    Returns:
        JWT token, user_id, email, full_name, and role (technician/agent)
        
    Raises:
        401: Invalid email or password
        403: User account is not active or not a ranger (admin cannot use this endpoint)
    """
    try:
        # Get client IP and device info
        client_ip = get_client_ip(http_request)
        device_info = user_agent or "Unknown Device"
        
        # Authenticate user
        user = await UserService.authenticate_user(db, request.email, request.password)
        
        if not user:
            # Log failed attempt with full details
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
                detail="Invalid email or password"
            )
        
        # Check if user is a ranger (technician or agent, not admin)
        if user["role"] == "admin":
            await UserService.log_identity_event(
                db,
                user_id=str(user["_id"]),
                email=user["email"],
                status="failed_attempt",
                device_info=device_info,
                ip_address=client_ip,
                reason="Admin attempted to use ranger login endpoint"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts cannot login through ranger endpoint. Use admin login."
            )
        
        # Update last login
        await UserService.update_last_login(db, str(user["_id"]))
        
        # Log successful login - mark as ranger login
        await UserService.log_identity_event(
            db,
            user_id=str(user["_id"]),
            email=user["email"],
            status="logged_in",
            device_info=device_info,
            ip_address=client_ip,
            reason="Ranger login with email and password"
        )
        
        # Create JWT token with role information
        access_token_expires = timedelta(minutes=60)
        access_token = create_access_token(
            data={
                "sub": user["email"],
                "role": user["role"],
                "user_id": str(user["_id"])
            },
            expires_delta=access_token_expires
        )
        
        logger.info(
            f"✅ 🟣 Ranger logged in: {request.email} (Role: {user['role']}) | "
            f"IP: {client_ip} | Device: {device_info}"
        )
        
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
        logger.error(f"Ranger login error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/scan", response_model=TokenResponse)
async def scan_qr(
    request: ScanQRRequest,
    user_agent: Optional[str] = Header(None),
    db = Depends(get_database)
):
    """
    Scan QR code to login
    For now, the QR token is stored with the user, so we verify it
    
    Args:
        request: ScanQRRequest with QR token
        user_agent: User agent from request header
        db: MongoDB database
        
    Returns:
        JWT token and user information
    """
    try:
        # Find user with this QR token
        collection = db["users"]
        user = await collection.find_one({"qr_token": request.qr_token})
        
        if not user:
            logger.warning(f"Invalid QR token attempted: {request.qr_token}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid QR token"
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
            reason="QR code scan"
        )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=60)
        access_token = create_access_token(
            data={"sub": user["email"]},
            expires_delta=access_token_expires
        )
        
        logger.info(f"✅ User logged in via QR: {user['email']}")
        
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
        logger.error(f"QR scan error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="QR scan failed"
        )


@router.post("/qr/validate", response_model=dict)
async def validate_qr_login(
    request: QRLoginRequest,
    http_request: Request,
    user_agent: Optional[str] = Header(None),
    db = Depends(get_database)
):
    """
    ⭐ VALIDATE QR TOKEN FOR LOGIN
    Validates QR token and checks:
    ✔ QR token is valid and exists
    ✔ QR token has not expired
    ✔ User account is still active
    ✔ User role is valid
    
    This endpoint is called before the actual login to verify the QR code
    can be used for authentication.
    
    Args:
        request: QRLoginRequest with QR token
        http_request: HTTP request for IP extraction
        user_agent: User agent from request header
        db: MongoDB database
        
    Returns:
        {
            "valid": true/false,
            "user_id": "user_mongo_id",
            "email": "ranger@example.com",
            "full_name": "Ranger Name",
            "role": "technician/agent",
            "expired": true/false,
            "expires_in_minutes": 15
        }
    """
    try:
        # Get client IP and device info
        client_ip = get_client_ip(http_request)
        device_info = user_agent or "Unknown Device"
        
        # Validate QR token
        user = await UserService.validate_qr_token(db, request.qr_token)
        
        if not user:
            # Log failed QR validation attempt
            await UserService.log_identity_event(
                db,
                user_id="unknown",
                email="unknown",
                status="failed_attempt",
                device_info=device_info,
                ip_address=client_ip,
                reason="Invalid or expired QR token"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid QR token"
            )
        
        # Calculate expiration time remaining
        expires_in_minutes = None
        is_expired = False
        
        if "qr_token_expires_at" in user and user["qr_token_expires_at"]:
            expires_at = user["qr_token_expires_at"]
            if isinstance(expires_at, str):
                from datetime import datetime
                expires_at = datetime.fromisoformat(expires_at)
            
            time_remaining = (expires_at - datetime.utcnow()).total_seconds() / 60
            expires_in_minutes = max(0, int(time_remaining))
            is_expired = time_remaining <= 0
        
        # Log successful QR validation
        await UserService.log_identity_event(
            db,
            user_id=str(user["_id"]),
            email=user["email"],
            status="qr_validated",
            device_info=device_info,
            ip_address=client_ip,
            reason=f"QR token validated | Expires in {expires_in_minutes} minutes"
        )
        
        logger.info(
            f"✅ QR token validated for user: {user['email']} | "
            f"IP: {client_ip} | Expires in: {expires_in_minutes} minutes"
        )
        
        return {
            "valid": True,
            "user_id": str(user["_id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "expired": is_expired,
            "expires_in_minutes": expires_in_minutes
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QR validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="QR token validation failed"
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
