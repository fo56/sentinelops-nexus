"""
QR Token Generation and QR Code utilities
Generates secure tokens and converts them to QR codes
"""

import logging
import json
import base64
from typing import Tuple, Dict
from datetime import datetime, timedelta
import secrets
import qrcode
from io import BytesIO
from app.config.settings import settings

logger = logging.getLogger(__name__)


class QRTokenService:
    """Service for generating and managing QR tokens"""
    
    TOKEN_LENGTH = settings.QR_TOKEN_LENGTH
    
    @staticmethod
    def generate_qr_token() -> str:
        """
        Generate a secure random QR token
        
        Returns:
            URL-safe random token
        """
        return secrets.token_urlsafe(QRTokenService.TOKEN_LENGTH)
    
    @staticmethod
    def create_qr_token_payload(user_id: str, email: str, expiry_minutes: int = 30) -> Dict:
        """
        Create a QR token payload
        
        Args:
            user_id: User's MongoDB ID
            email: User's email
            expiry_minutes: Token expiration time in minutes
            
        Returns:
            Token payload dictionary
        """
        expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        
        return {
            "user_id": user_id,
            "email": email,
            "generated_at": datetime.utcnow().isoformat(),
            "expires_at": expiry.isoformat(),
            "token": QRTokenService.generate_qr_token()
        }
    
    @staticmethod
    def generate_qr_code_image(data: str) -> bytes:
        """
        Generate a QR code image from data
        
        Args:
            data: Data to encode in QR code (usually a token or URL)
            
        Returns:
            QR code image as PNG bytes
        """
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to bytes
            img_byte_arr = BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            return img_byte_arr.getvalue()
        
        except Exception as e:
            logger.error(f"Error generating QR code: {e}")
            raise
    
    @staticmethod
    def generate_qr_code_base64(data: str) -> str:
        """
        Generate QR code and return as base64 encoded string
        
        Args:
            data: Data to encode in QR code
            
        Returns:
            Base64 encoded QR code image
        """
        try:
            qr_bytes = QRTokenService.generate_qr_code_image(data)
            qr_base64 = base64.b64encode(qr_bytes).decode('utf-8')
            return f"data:image/png;base64,{qr_base64}"
        
        except Exception as e:
            logger.error(f"Error generating base64 QR code: {e}")
            raise
    
    @staticmethod
    def create_qr_login_url(qr_token: str, base_url: str = settings.FRONTEND_URL) -> str:
        """
        Create a QR login URL
        
        Args:
            qr_token: The QR token
            base_url: Base URL for the frontend
            
        Returns:
            Full login URL
        """
        return f"{base_url}/auth/scan?token={qr_token}"


def generate_qr_with_token(user_id: str, email: str) -> Tuple[str, str, str]:
    """
    Generate QR token and QR code image
    
    Args:
        user_id: User's MongoDB ID
        email: User's email
        
    Returns:
        Tuple of (qr_token, qr_image_base64, login_url)
    """
    try:
        # Generate token payload
        qr_token = QRTokenService.generate_qr_token()
        
        # Create login URL
        login_url = QRTokenService.create_qr_login_url(qr_token)
        
        # Generate QR code image
        qr_image_base64 = QRTokenService.generate_qr_code_base64(login_url)
        
        logger.info(f"✅ Generated QR token for user: {email}")
        
        return qr_token, qr_image_base64, login_url
    
    except Exception as e:
        logger.error(f"Error generating QR with token: {e}")
        raise
