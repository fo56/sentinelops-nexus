"""
2FA Models and Schemas
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MFAMethod(str, Enum):
    """Supported 2FA methods"""
    TOTP = "totp"  # Time-based One-Time Password (Google Authenticator)
    SMS = "sms"    # SMS OTP
    EMAIL = "email"  # Email OTP
    BACKUP_CODES = "backup_codes"


class MFASetupRequest(BaseModel):
    """Request to setup 2FA"""
    method: MFAMethod = Field(..., description="2FA method to setup")
    phone_number: Optional[str] = Field(None, description="Phone number for SMS")


class MFASetupResponse(BaseModel):
    """Response with 2FA setup details"""
    setup_id: str = Field(..., description="Setup session ID")
    method: MFAMethod
    qr_code: Optional[str] = Field(None, description="Base64 QR code for TOTP")
    secret: Optional[str] = Field(None, description="Secret key for TOTP")
    backup_codes: List[str] = Field(..., description="Backup codes for recovery")
    expires_at: datetime = Field(..., description="Setup expires at")


class MFAVerification(BaseModel):
    """2FA verification request"""
    code: str = Field(..., min_length=4, max_length=10, description="OTP code")
    method: MFAMethod
    user_id: Optional[str] = Field(None, description="User ID for verification")


class MFAVerificationResponse(BaseModel):
    """Response to 2FA verification"""
    verified: bool = Field(..., description="Verification status")
    message: str = Field(..., description="Verification message")
    remaining_attempts: Optional[int] = Field(None, description="Attempts remaining")


class MFAConfig(BaseModel):
    """User's 2FA configuration"""
    user_id: str
    enabled_methods: List[MFAMethod] = Field(default=[], description="Enabled 2FA methods")
    preferred_method: Optional[MFAMethod] = Field(None, description="Preferred 2FA method")
    phone_number: Optional[str] = Field(None, description="Phone for SMS")
    backup_codes_used: int = Field(default=0, description="Backup codes used")
    total_backup_codes: int = Field(default=10, description="Total backup codes generated")
    failed_attempts: int = Field(default=0, description="Failed verification attempts")
    last_verified: Optional[datetime] = Field(None, description="Last successful verification")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MFAStatus(BaseModel):
    """2FA status for user"""
    user_id: str
    is_enabled: bool = Field(..., description="Is 2FA enabled")
    enabled_methods: List[MFAMethod]
    preferred_method: Optional[MFAMethod]
    backup_codes_remaining: int = Field(..., description="Backup codes available")
    last_verified: Optional[datetime]


class BackupCodeResponse(BaseModel):
    """Response with new backup codes"""
    codes: List[str] = Field(..., description="New backup codes")
    message: str = Field(..., description="Informational message")
