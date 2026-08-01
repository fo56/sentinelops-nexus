"""
2FA Routes
Phase 3 API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from .mfa_models import (
    MFASetupRequest, MFASetupResponse, MFAVerification, 
    MFAVerificationResponse, MFAStatus, MFAMethod, BackupCodeResponse
)
from .mfa_services import MFAService
from app.utils.auth import verify_token
from app.database.mongodb import get_database
from typing import Optional

router = APIRouter(prefix="/api/mfa", tags=["2FA System"])


async def get_mfa_service(db=Depends(get_database)) -> MFAService:
    """Dependency to get MFA service"""
    return MFAService(db)


@router.post("/setup/totp", response_model=MFASetupResponse)
async def setup_totp(
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service)
):
    """
    Setup TOTP (Google Authenticator) for user
    
    Returns QR code, secret, and backup codes
    """
    try:
        secret, backup_codes, qr_code = await mfa_service.setup_totp(user_id)
        
        from datetime import datetime, timedelta
        return MFASetupResponse(
            setup_id=user_id,
            method=MFAMethod.TOTP,
            qr_code=qr_code,
            secret=secret,
            backup_codes=backup_codes,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup TOTP: {str(e)}"
        )


@router.post("/setup/sms", response_model=dict)
async def setup_sms(
    request: MFASetupRequest,
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service)
):
    """Setup SMS-based 2FA"""
    if not request.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number required for SMS setup"
        )
    
    try:
        setup_id = await mfa_service.setup_sms(user_id, request.phone_number)
        return {
            "message": "SMS OTP sent to your phone",
            "setup_id": str(setup_id),
            "method": MFAMethod.SMS.value
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup SMS: {str(e)}"
        )


@router.post("/setup/email", response_model=dict)
async def setup_email(
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service),
    db=Depends(get_database)
):
    """Setup Email-based 2FA"""
    # Get user email from database
    user = await db['users'].find_one({'_id': user_id})
    if not user or not user.get('email'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email not found"
        )
    
    try:
        setup_id = await mfa_service.setup_email_otp(user_id, user['email'])
        return {
            "message": "OTP sent to your email",
            "setup_id": str(setup_id),
            "method": MFAMethod.EMAIL.value
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup Email OTP: {str(e)}"
        )


@router.post("/verify", response_model=MFAVerificationResponse)
async def verify_2fa(
    request: MFAVerification,
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service),
    db=Depends(get_database)
):
    """Verify 2FA code"""
    try:
        if request.method == MFAMethod.TOTP:
            # Get user's TOTP secret
            mfa_config = await db['mfa_configs'].find_one({'user_id': user_id})
            if not mfa_config or 'totp_secret' not in mfa_config:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="TOTP not configured"
                )
            
            verified = await mfa_service.verify_totp(user_id, request.code, mfa_config['totp_secret'])
            
        elif request.method == MFAMethod.SMS:
            verified, message = await mfa_service.verify_sms(user_id, request.code)
            
        elif request.method == MFAMethod.EMAIL:
            verified, message = await mfa_service.verify_email_otp(user_id, request.code)
            
        elif request.method == MFAMethod.BACKUP_CODES:
            verified, message = await mfa_service.verify_backup_code(user_id, request.code)
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid MFA method"
            )
        
        if not verified:
            mfa_config = await db['mfa_configs'].find_one({'user_id': user_id})
            remaining = 5 - mfa_config.get('failed_attempts', 0)
            
            return MFAVerificationResponse(
                verified=False,
                message="Invalid 2FA code",
                remaining_attempts=max(0, remaining)
            )
        
        return MFAVerificationResponse(
            verified=True,
            message="2FA verification successful"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@router.get("/status", response_model=MFAStatus)
async def get_2fa_status(
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service)
):
    """Get user's 2FA status"""
    try:
        status_info = await mfa_service.get_2fa_status(user_id)
        return status_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get 2FA status: {str(e)}"
        )


@router.post("/enable", response_model=dict)
async def enable_2fa(
    request: MFASetupRequest,
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service),
    db=Depends(get_database)
):
    """Enable 2FA for user"""
    try:
        # Get TOTP secret from setup
        setup = await db['totp_setups'].find_one({
            'user_id': user_id,
            'status': 'pending'
        })
        
        secret = setup['secret'] if setup else None
        config = await mfa_service.enable_2fa(user_id, request.method, secret)
        
        # Mark setup as confirmed
        if setup:
            await db['totp_setups'].update_one(
                {'_id': setup['_id']},
                {'$set': {'status': 'confirmed'}}
            )
        
        return {
            "message": f"{request.method.value} 2FA enabled successfully",
            "enabled_methods": config.enabled_methods,
            "preferred_method": config.preferred_method
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable 2FA: {str(e)}"
        )


@router.post("/disable", response_model=dict)
async def disable_2fa(
    request: MFASetupRequest,
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service)
):
    """Disable 2FA method"""
    try:
        success = await mfa_service.disable_2fa(user_id, request.method)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{request.method.value} 2FA not enabled"
            )
        
        return {
            "message": f"{request.method.value} 2FA disabled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable 2FA: {str(e)}"
        )


@router.post("/backup-codes/regenerate", response_model=BackupCodeResponse)
async def regenerate_backup_codes(
    user_id: str = Depends(verify_token),
    mfa_service: MFAService = Depends(get_mfa_service)
):
    """Generate new backup codes"""
    try:
        codes = await mfa_service.regenerate_backup_codes(user_id)
        
        return BackupCodeResponse(
            codes=codes,
            message="New backup codes generated. Store them in a safe place!"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate backup codes: {str(e)}"
        )
