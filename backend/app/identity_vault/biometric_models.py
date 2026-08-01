"""
Biometric Authentication Models and Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BiometricType(str, Enum):
    """Supported biometric types"""
    FINGERPRINT = "fingerprint"
    FACE = "face"
    IRIS = "iris"
    VOICE = "voice"


class BiometricEnrollment(BaseModel):
    """Biometric enrollment record"""
    user_id: str
    biometric_type: BiometricType
    biometric_data: str = Field(..., description="Encrypted biometric template")
    enrollment_date: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = Field(ge=0, le=1, description="Quality score")
    device_id: Optional[str] = Field(None, description="Device where enrolled")
    is_primary: bool = Field(default=False, description="Primary biometric")
    failed_matches: int = Field(default=0)
    successful_matches: int = Field(default=0)
    last_used: Optional[datetime] = None
    status: str = Field(default="active", description="active|disabled|pending")


class BiometricVerificationRequest(BaseModel):
    """Biometric verification request"""
    biometric_type: BiometricType
    biometric_data: str = Field(..., description="Biometric template to verify")
    device_id: Optional[str] = None
    user_id: Optional[str] = None


class BiometricVerificationResponse(BaseModel):
    """Biometric verification response"""
    verified: bool
    confidence_score: float = Field(ge=0, le=1)
    message: str
    user_id: Optional[str] = None


class BiometricEnrollmentRequest(BaseModel):
    """Request to enroll new biometric"""
    biometric_type: BiometricType
    biometric_data: str = Field(..., description="Raw biometric data")
    device_id: Optional[str] = None
    is_primary: bool = Field(default=False)


class BiometricEnrollmentResponse(BaseModel):
    """Response to biometric enrollment"""
    enrolled: bool
    message: str
    confidence_score: Optional[float] = None
    enrollment_id: Optional[str] = None


class BiometricDeviceToken(BaseModel):
    """Token for biometric device registration"""
    token: str
    device_id: str
    expires_at: datetime
    device_name: Optional[str] = None
    device_type: Optional[str] = None


class BiometricStatus(BaseModel):
    """User's biometric status"""
    user_id: str
    biometric_enabled: bool
    enrolled_types: List[BiometricType]
    primary_biometric: Optional[BiometricType]
    total_enrollments: int
    last_verification: Optional[datetime]
    devices: List[str] = Field(default=[], description="Registered devices")


class BiometricAuditLog(BaseModel):
    """Biometric verification audit log"""
    user_id: str
    biometric_type: BiometricType
    verification_result: bool
    confidence_score: float
    device_id: Optional[str]
    timestamp: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
