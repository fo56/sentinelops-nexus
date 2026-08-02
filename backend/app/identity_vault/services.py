"""
Identity Vault Services
User management, authentication, and role-based access control
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
from bson import ObjectId
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status

from .models import (
    UserRole, RangerStatus, PermissionModel,
    UserCreate, UserResponse, UserMe, IdentityLog
)

logger = logging.getLogger(__name__)

# Password hashing using bcrypt
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


class UserService:
    """Service for user management"""
    
    USERS_COLLECTION = "users"
    IDENTITY_LOGS_COLLECTION = "identity_logs"
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using Argon2"""
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Password hashing error: {e}")
            raise
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify plain password against hashed password"""
        try:
            result = pwd_context.verify(plain_password, hashed_password)
            logger.debug(f"Password verification result: {result}")
            return result
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            logger.debug(f"Hashed password format: {hashed_password[:50]}...")
            return False
    
    @classmethod
    async def create_user(
        cls,
        db: AsyncIOMotorDatabase,
        full_name: str,
        email: str,
        password: str,
        age: int,
        marital_status: str,
        criminal_record: bool,
        role: str,
        health_issues: bool
    ) -> Dict:
        """
        Create a new user in MongoDB
        
        Args:
            db: MongoDB database instance
            full_name: User's full name
            email: User's email
            password: Plain password (will be hashed)
            age: User's age
            marital_status: User's marital status
            criminal_record: Whether user has criminal record
            role: User's role (admin, technician, agent)
            health_issues: Whether user has health issues
            
        Returns:
            Created user document
        """
        collection = db[cls.USERS_COLLECTION]
        
        # Check if user already exists
        existing_user = await collection.find_one({"email": email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user document
        user_doc = {
            "full_name": full_name,
            "email": email,
            "password": cls.hash_password(password),
            "age": age,
            "marital_status": marital_status,
            "criminal_record": criminal_record,
            "role": role,
            "health_issues": health_issues,
            "status": RangerStatus.ACTIVE.value,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "last_logout": None,
            "permissions": await cls._get_permissions_for_role(role),
            # Score system for agents and technicians
            "score": 100,  # Default score for all rangers (agents)
            "technician_score": 100,  # Default score for technicians
            "availability": "free" if role == "agent" else "unavailable",
            "active_missions": 0,
            "completed_missions": 0,
            "failed_missions": 0
        }
        
        result = await collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        
        logger.info(f" Created new user: {email} with role: {role}")
        return user_doc
    
    @classmethod
    async def get_user_by_email(cls, db: AsyncIOMotorDatabase, email: str) -> Optional[Dict]:
        """Get user by email"""
        collection = db[cls.USERS_COLLECTION]
        return await collection.find_one({"email": email})
    
    @classmethod
    async def get_user_by_id(cls, db: AsyncIOMotorDatabase, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        collection = db[cls.USERS_COLLECTION]
        try:
            return await collection.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None
    
    @classmethod
    async def authenticate_user(
        cls,
        db: AsyncIOMotorDatabase,
        email: str,
        password: str
    ) -> Optional[Dict]:
        """
        Authenticate user with email and password
        
        Args:
            db: MongoDB database instance
            email: User email
            password: Plain password
            
        Returns:
            User document if authenticated, None otherwise
        """
        user = await cls.get_user_by_email(db, email)
        
        if not user:
            logger.warning(f"Login attempt for non-existent user: {email}")
            return None
        
        if not cls.verify_password(password, user["password"]):
            logger.warning(f"Failed login attempt for user: {email}")
            return None
        
        if user["status"] != RangerStatus.ACTIVE.value:
            logger.warning(f"Login attempt by inactive user: {email} (status: {user['status']})")
            return None
        
        return user
    
    @classmethod
    async def update_last_login(cls, db: AsyncIOMotorDatabase, user_id: str) -> bool:
        """Update user's last login timestamp"""
        collection = db[cls.USERS_COLLECTION]
        try:
            result = await collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating last login: {e}")
            return False
    
    @classmethod
    async def _get_permissions_for_role(cls, role: str) -> Dict:
        """Get permissions based on user role"""
        permissions_map = {
            UserRole.ADMIN.value: {
                "create_users": True,
                "view_all_data": True,
                "view_missions": True,
                "fix_issues": True,
                "upload_evidence": True,
                "manage_facilities": True,
                "access_knowledge_base": True
            },
            UserRole.TECHNICIAN.value: {
                "create_users": False,
                "view_all_data": False,
                "view_missions": True,
                "fix_issues": True,
                "upload_evidence": False,
                "manage_facilities": False,
                "access_knowledge_base": True
            },
            UserRole.AGENT.value: {
                "create_users": False,
                "view_all_data": False,
                "view_missions": True,
                "fix_issues": False,
                "upload_evidence": True,
                "manage_facilities": False,
                "access_knowledge_base": True
            }
        }
        
        return permissions_map.get(role, {})
    
    @classmethod
    async def log_identity_event(
        cls,
        db: AsyncIOMotorDatabase,
        user_id: str,
        email: str,
        status: str,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        reason: Optional[str] = None
    ) -> bool:
        """
        Log identity events (login, logout, failed attempts)
        
        Args:
            db: MongoDB database instance
            user_id: User's ID
            email: User's email
            status: Event status (logged_in, logged_out, failed_attempt)
            device_info: Device information
            ip_address: User's IP address
            reason: Reason for the event
            
        Returns:
            True if logged successfully
        """
        collection = db[cls.IDENTITY_LOGS_COLLECTION]
        
        log_doc = {
            "user_id": user_id,
            "email": email,
            "login_time": datetime.utcnow(),
            "logout_time": None,
            "device_info": device_info,
            "ip_address": ip_address,
            "status": status,
            "reason": reason
        }
        
        try:
            await collection.insert_one(log_doc)
            logger.info(f" Logged identity event: {status} for user: {email}")
            return True
        except Exception as e:
            logger.error(f"Error logging identity event: {e}")
            return False
    
    @classmethod
    async def get_identity_logs(
        cls,
        db: AsyncIOMotorDatabase,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """Get identity logs, optionally filtered by user"""
        collection = db[cls.IDENTITY_LOGS_COLLECTION]
        
        query = {}
        if user_id:
            query["user_id"] = user_id
        
        logs = await collection.find(query).sort("login_time", -1).limit(limit).to_list(length=None)
        return logs
    
    @classmethod
    async def user_to_response(cls, user: Dict) -> UserResponse:
        """Convert user document to response model"""
        # Build response dict with _id for proper alias handling
        response_data = {
            "_id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name", "Unknown"),
            "age": user.get("age", 0),
            "marital_status": user.get("marital_status", "single"),
            "role": user.get("role", "technician"),
            "status": user.get("status", "active"),
            "criminal_record": user.get("criminal_record", False),
            "health_issues": user.get("health_issues", False),
            "created_at": user.get("created_at", datetime.utcnow()),
            "last_login": user.get("last_login")
        }
        return UserResponse(**response_data)
    
    @classmethod
    async def user_to_me_response(cls, user: Dict) -> UserMe:
        """Convert user document to UserMe response model"""
        permissions_dict = user.get("permissions", {})
        permissions = PermissionModel(**permissions_dict)
        
        return UserMe(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            age=user["age"],
            status=user["status"],
            permissions=permissions,
            last_login=user.get("last_login")
        )
    
    @classmethod
    async def validate_qr_token(
        cls,
        db: AsyncIOMotorDatabase,
        qr_token: str
    ) -> Optional[Dict]:
        """
        Validate QR token and check expiration
        
        Args:
            db: MongoDB database instance
            qr_token: QR token to validate
            
        Returns:
            User document if token is valid and not expired, None otherwise
        """
        collection = db[cls.USERS_COLLECTION]
        user = await collection.find_one({"qr_token": qr_token})
        
        if not user:
            logger.warning(f"Invalid QR token attempted: {qr_token}")
            return None
        
        # Check if QR token has expiration
        if "qr_token_expires_at" in user and user["qr_token_expires_at"]:
            expires_at = user["qr_token_expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            
            if datetime.utcnow() > expires_at:
                logger.warning(f"QR token expired for user: {user['email']}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="QR token has expired"
                )
        
        if user["status"] != RangerStatus.ACTIVE.value:
            logger.warning(f"Login attempt by inactive user via QR: {user['email']}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not active"
            )
        
        return user

import secrets
import qrcode
import base64
from io import BytesIO
from app.config.settings import settings

class QRTokenService:
    """Service for generating and managing QR tokens"""
    
    TOKEN_LENGTH = 32
    
    @staticmethod
    def generate_qr_token() -> str:
        return secrets.token_urlsafe(QRTokenService.TOKEN_LENGTH)
    

    @staticmethod
    def generate_qr_code_image(data: str) -> bytes:
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            img_byte_arr = BytesIO()
            img.save(img_byte_arr)
            img_byte_arr.seek(0)
            return img_byte_arr.getvalue()
        except Exception as e:
            logger.error(f"Error generating QR code: {e}")
            raise
    
    @staticmethod
    def generate_qr_code_base64(data: str) -> str:
        try:
            qr_bytes = QRTokenService.generate_qr_code_image(data)
            qr_base64 = base64.b64encode(qr_bytes).decode('utf-8')
            return f"data:image/png;base64,{qr_base64}"
        except Exception as e:
            logger.error(f"Error generating base64 QR code: {e}")
            raise
    
    @staticmethod
    def create_qr_login_url(qr_token: str, base_url: str = settings.FRONTEND_URL) -> str:
        return f"{base_url}/auth/scan?token={qr_token}"

def generate_qr_with_token(user_id: str, email: str) -> tuple[str, str, str]:
    try:
        qr_token = QRTokenService.generate_qr_token()
        login_url = QRTokenService.create_qr_login_url(qr_token)
        qr_image_base64 = QRTokenService.generate_qr_code_base64(login_url)
        logger.info(f" Generated QR token for user: {email}")
        return qr_token, qr_image_base64, login_url
    except Exception as e:
        logger.error(f"Error generating QR with token: {e}")
        raise
