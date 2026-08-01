"""
Biometric Authentication Routes
Phase 3 API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from .biometric_models import (
    BiometricEnrollmentRequest, BiometricEnrollmentResponse,
    BiometricVerificationRequest, BiometricVerificationResponse,
    BiometricStatus, BiometricType
)
from .biometric_services import BiometricService
from app.utils.auth import verify_token
from app.database.mongodb import get_database
from typing import Optional

router = APIRouter(prefix="/api/biometric", tags=["Biometric Auth"])


async def get_biometric_service(db=Depends(get_database)) -> BiometricService:
    """Dependency to get biometric service"""
    return BiometricService(db)


@router.post("/enroll", response_model=BiometricEnrollmentResponse)
async def enroll_biometric(
    request: BiometricEnrollmentRequest,
    user_id: str = Depends(verify_token),
    biometric_service: BiometricService = Depends(get_biometric_service)
):
    """
    Enroll new biometric
    Supports: fingerprint, face, iris, voice
    """
    try:
        success, message, confidence = await biometric_service.enroll_biometric(
            user_id=user_id,
            biometric_type=request.biometric_type,
            biometric_data=request.biometric_data,
            device_id=request.device_id,
            is_primary=request.is_primary
        )
        
        return BiometricEnrollmentResponse(
            enrolled=success,
            message=message,
            confidence_score=confidence,
            enrollment_id=user_id if success else None
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enrollment failed: {str(e)}"
        )


@router.post("/verify", response_model=BiometricVerificationResponse)
async def verify_biometric(
    request: BiometricVerificationRequest,
    user_id: Optional[str] = Depends(verify_token),
    biometric_service: BiometricService = Depends(get_biometric_service),
    x_forwarded_for: Optional[str] = Header(None)
):
    """
    Verify biometric
    Can be used for login or secondary verification
    """
    try:
        # Use provided user_id or the authenticated one
        target_user_id = request.user_id or user_id
        
        if not target_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User identification required"
            )
        
        verified, confidence, message = await biometric_service.verify_biometric(
            user_id=target_user_id,
            biometric_type=request.biometric_type,
            biometric_data=request.biometric_data,
            device_id=request.device_id
        )
        
        return BiometricVerificationResponse(
            verified=verified,
            confidence_score=confidence,
            message=message,
            user_id=target_user_id if verified else None
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@router.get("/status", response_model=BiometricStatus)
async def get_biometric_status(
    user_id: str = Depends(verify_token),
    biometric_service: BiometricService = Depends(get_biometric_service)
):
    """Get user's biometric enrollment status"""
    try:
        status_info = await biometric_service.get_biometric_status(user_id)
        return status_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get status: {str(e)}"
        )


@router.post("/disable", response_model=dict)
async def disable_biometric(
    biometric_type: BiometricType,
    user_id: str = Depends(verify_token),
    biometric_service: BiometricService = Depends(get_biometric_service)
):
    """Disable specific biometric"""
    try:
        success = await biometric_service.disable_biometric(user_id, biometric_type)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{biometric_type.value} not found"
            )
        
        return {
            "message": f"{biometric_type.value} disabled successfully",
            "biometric_type": biometric_type.value
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable: {str(e)}"
        )


@router.post("/device/register", response_model=dict)
async def register_device(
    device_name: str,
    device_type: str,
    user_id: str = Depends(verify_token),
    biometric_service: BiometricService = Depends(get_biometric_service)
):
    """Register biometric device"""
    try:
        device_id, expires_at = await biometric_service.register_device(
            user_id=user_id,
            device_name=device_name,
            device_type=device_type
        )
        
        return {
            "device_id": device_id,
            "device_name": device_name,
            "device_type": device_type,
            "expires_at": expires_at,
            "message": "Device registered successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Device registration failed: {str(e)}"
        )


@router.get("/devices", response_model=dict)
async def list_devices(
    user_id: str = Depends(verify_token),
    biometric_service: BiometricService = Depends(get_biometric_service)
):
    """List registered biometric devices"""
    try:
        devices = await biometric_service.list_devices(user_id)
        return {
            "devices": devices,
            "total": len(devices)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list devices: {str(e)}"
        )


@router.post("/device/revoke", response_model=dict)
async def revoke_device(
    device_id: str,
    user_id: str = Depends(verify_token),
    biometric_service: BiometricService = Depends(get_biometric_service)
):
    """Revoke device access"""
    try:
        success = await biometric_service.revoke_device(user_id, device_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found"
            )
        
        return {
            "message": "Device revoked successfully",
            "device_id": device_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke device: {str(e)}"
        )
