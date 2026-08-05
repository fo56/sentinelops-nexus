"""
Identity Vault Models
User, Admin, Roles, and Authentication models
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "admin"
    TECHNICIAN = "technician"
    AGENT = "agent"


class RangerStatus(str, Enum):
    """Ranger/User status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class MaritalStatus(str, Enum):
    """Marital status enumeration"""
    SINGLE = "single"
    MARRIED = "married"


class PermissionModel(BaseModel):
    """Model for user permissions"""
    create_users: bool = False
    view_all_data: bool = False
    view_missions: bool = False
    fix_issues: bool = False
    upload_evidence: bool = False
    manage_facilities: bool = False
    access_knowledge_base: bool = False


class UserCreate(BaseModel):
    """Model for creating a new user (Ranger) by Admin"""
    full_name: str = Field(..., min_length=2, description="Full name of the ranger")
    age: int = Field(..., ge=18, le=100, description="Age of the ranger")
    marital_status: MaritalStatus = Field(..., description="Marital status")
    criminal_record: bool = Field(..., description="Has no criminal record")
    role: UserRole = Field(..., description="Role: technician or agent")
    health_issues: bool = Field(..., description="Has any health issues")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")


class UserUpdate(BaseModel):
    """Model for updating user information"""
    full_name: Optional[str] = None
    age: Optional[int] = None
    marital_status: Optional[MaritalStatus] = None
    health_issues: Optional[bool] = None
    status: Optional[RangerStatus] = None


class UserResponse(BaseModel):
    """Model for user response"""
    id: str = Field(alias="_id")
    email: str
    full_name: str
    age: int
    marital_status: MaritalStatus
    role: UserRole
    status: RangerStatus
    criminal_record: bool
    health_issues: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserMe(BaseModel):
    """Model for current logged-in user details"""
    id: str
    email: str
    full_name: str
    role: UserRole
    age: int
    status: RangerStatus
    permissions: PermissionModel
    last_login: Optional[datetime] = None


class AdminCreateUserRequest(BaseModel):
    """Request model for admin to create a ranger"""
    full_name: str = Field(..., min_length=2)
    age: int = Field(..., ge=18, le=100)
    marital_status: MaritalStatus
    criminal_record: bool = Field(...)
    role: UserRole = Field(..., description="technician or agent")
    health_issues: bool
    email: EmailStr
    password: str = Field(..., min_length=8)


class AdminCreateUserResponse(BaseModel):
    """Response after admin creates a user"""
    user_id: str
    email: str
    full_name: str
    role: UserRole
    token: str
    message: str


class LoginRequest(BaseModel):
    """Request model for user login"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response model for token"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: UserRole


class LoginTokenResponse(BaseModel):
    """Response model for login token"""
    token: str
    user_id: str
    email: str
    expires_in_minutes: int


class TokenLoginRequest(BaseModel):
    """Request model for logging in with a token"""
    token: str


class RangerLoginRequest(BaseModel):
    """Request model for ranger login with email and password"""
    email: EmailStr = Field(..., description="Ranger's email address")
    password: str = Field(..., min_length=8, description="Ranger's password")





class IdentityLog(BaseModel):
    """Model for identity logging"""
    user_id: str
    email: str
    login_time: datetime
    logout_time: Optional[datetime] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    status: str = "logged_in"  # logged_in, logged_out, failed_attempt
    reason: Optional[str] = None
    token_login: Optional[bool] = False  # Whether login was via token


class IdentityLogResponse(BaseModel):
    """Response model for identity logs"""
    id: str = Field(alias="_id")
    user_id: str
    email: str
    login_time: datetime
    logout_time: Optional[datetime] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    reason: Optional[str] = None

    class Config:
        populate_by_name = True
