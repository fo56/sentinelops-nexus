"""
2FA Services
"""

import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from .mfa_models import MFAMethod, MFAConfig, MFAStatus


class MFAService:
    """Multi-Factor Authentication Service"""
    
    def __init__(self, db):
        self.db = db
        self.mfa_collection = db['mfa_configs']
        self.otp_attempts_collection = db['otp_attempts']
        self.backup_codes_collection = db['backup_codes']
    
    async def setup_totp(self, user_id: str) -> Tuple[str, List[str], str]:
        """
        Setup Time-based One-Time Password (TOTP)
        Returns: (secret, backup_codes, qr_code_base64)
        """
        # Generate TOTP secret
        secret = pyotp.random_base32()
        
        # Generate QR code
        totp = pyotp.TOTP(secret)
        qr_uri = totp.provisioning_uri(name=user_id, issuer_name='SentinelOps')
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer)
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Generate backup codes
        backup_codes = await self._generate_backup_codes(10)
        
        # Store in pending setup
        setup_doc = {
            'user_id': user_id,
            'method': MFAMethod.TOTP.value,
            'secret': secret,
            'backup_codes': backup_codes,
            'status': 'pending',
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(hours=1)
        }
        
        result = await self.db['totp_setups'].insert_one(setup_doc)
        
        return secret, backup_codes, f"data:image/png;base64,{qr_base64}"
    
    async def verify_totp(self, user_id: str, code: str, secret: str) -> bool:
        """Verify TOTP code"""
        totp = pyotp.TOTP(secret)
        
        # Verify with time window of ±30 seconds (1 interval)
        is_valid = totp.verify(code, valid_window=1)
        
        if not is_valid:
            await self._record_failed_attempt(user_id, MFAMethod.TOTP)
            return False
        
        # Reset failed attempts on success
        await self.mfa_collection.update_one(
            {'user_id': user_id},
            {'$set': {'failed_attempts': 0, 'last_verified': datetime.utcnow()}}
        )
        
        return True
    
    async def setup_sms(self, user_id: str, phone_number: str) -> str:
        """Setup SMS-based 2FA"""
        # In production, integrate with Twilio or AWS SNS
        otp_code = str(secrets.randbelow(1000000)).zfill(6)
        
        otp_doc = {
            'user_id': user_id,
            'phone_number': phone_number,
            'method': MFAMethod.SMS.value,
            'code': otp_code,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=10),
            'used': False
        }
        
        result = await self.db['sms_otps'].insert_one(otp_doc)
        
        # TODO: Send SMS with otp_code
        # await send_sms(phone_number, f"Your SentinelOps verification code: {otp_code}")
        
        return result.inserted_id
    
    async def verify_sms(self, user_id: str, code: str) -> Tuple[bool, str]:
        """Verify SMS OTP"""
        otp_record = await self.db['sms_otps'].find_one({
            'user_id': user_id,
            'code': code,
            'used': False,
            'expires_at': {'$gt': datetime.utcnow()}
        })
        
        if not otp_record:
            await self._record_failed_attempt(user_id, MFAMethod.SMS)
            return False, "Invalid or expired code"
        
        # Mark as used
        await self.db['sms_otps'].update_one(
            {'_id': otp_record['_id']},
            {'$set': {'used': True}}
        )
        
        # Update MFA config
        await self.mfa_collection.update_one(
            {'user_id': user_id},
            {'$set': {'failed_attempts': 0, 'last_verified': datetime.utcnow()}}
        )
        
        return True, "SMS verification successful"
    
    async def setup_email_otp(self, user_id: str, email: str) -> str:
        """Setup Email-based OTP"""
        otp_code = str(secrets.randbelow(1000000)).zfill(6)
        
        otp_doc = {
            'user_id': user_id,
            'email': email,
            'method': MFAMethod.EMAIL.value,
            'code': otp_code,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=10),
            'used': False
        }
        
        result = await self.db['email_otps'].insert_one(otp_doc)
        
        # TODO: Send email with otp_code
        # await send_email(email, f"Your SentinelOps verification code: {otp_code}")
        
        return result.inserted_id
    
    async def verify_email_otp(self, user_id: str, code: str) -> Tuple[bool, str]:
        """Verify Email OTP"""
        otp_record = await self.db['email_otps'].find_one({
            'user_id': user_id,
            'code': code,
            'used': False,
            'expires_at': {'$gt': datetime.utcnow()}
        })
        
        if not otp_record:
            await self._record_failed_attempt(user_id, MFAMethod.EMAIL)
            return False, "Invalid or expired code"
        
        # Mark as used
        await self.db['email_otps'].update_one(
            {'_id': otp_record['_id']},
            {'$set': {'used': True}}
        )
        
        return True, "Email verification successful"
    
    async def verify_backup_code(self, user_id: str, code: str) -> Tuple[bool, str]:
        """Verify and use backup code"""
        backup_record = await self.backup_codes_collection.find_one({
            'user_id': user_id,
            'code': code,
            'used': False
        })
        
        if not backup_record:
            return False, "Invalid backup code"
        
        # Mark code as used
        await self.backup_codes_collection.update_one(
            {'_id': backup_record['_id']},
            {'$set': {'used': True, 'used_at': datetime.utcnow()}}
        )
        
        # Update MFA config
        await self.mfa_collection.update_one(
            {'user_id': user_id},
            {
                '$set': {'last_verified': datetime.utcnow()},
                '$inc': {'backup_codes_used': 1}
            }
        )
        
        return True, "Backup code verified"
    
    async def enable_2fa(self, user_id: str, method: MFAMethod, secret: Optional[str] = None) -> MFAConfig:
        """Enable 2FA for user"""
        mfa_config = await self.mfa_collection.find_one({'user_id': user_id})
        
        if mfa_config:
            # Add method if not already present
            if method.value not in mfa_config.get('enabled_methods', []):
                await self.mfa_collection.update_one(
                    {'user_id': user_id},
                    {
                        '$push': {'enabled_methods': method.value},
                        '$set': {'preferred_method': method.value}
                    }
                )
        else:
            # Create new MFA config
            config_doc = {
                'user_id': user_id,
                'enabled_methods': [method.value],
                'preferred_method': method.value,
                'backup_codes_used': 0,
                'total_backup_codes': 10,
                'failed_attempts': 0,
                'created_at': datetime.utcnow()
            }
            
            if secret and method == MFAMethod.TOTP:
                config_doc['totp_secret'] = secret
            
            await self.mfa_collection.insert_one(config_doc)
        
        return MFAConfig(**mfa_config)
    
    async def disable_2fa(self, user_id: str, method: MFAMethod) -> bool:
        """Disable 2FA method for user"""
        result = await self.mfa_collection.update_one(
            {'user_id': user_id},
            {'$pull': {'enabled_methods': method.value}}
        )
        
        return result.modified_count > 0
    
    async def get_2fa_status(self, user_id: str) -> Optional[MFAStatus]:
        """Get 2FA status for user"""
        mfa_config = await self.mfa_collection.find_one({'user_id': user_id})
        
        if not mfa_config:
            return MFAStatus(
                user_id=user_id,
                is_enabled=False,
                enabled_methods=[],
                preferred_method=None,
                backup_codes_remaining=0,
                last_verified=None
            )
        
        # Count remaining backup codes
        remaining = await self.backup_codes_collection.count_documents({
            'user_id': user_id,
            'used': False
        })
        
        return MFAStatus(
            user_id=user_id,
            is_enabled=len(mfa_config.get('enabled_methods', [])) > 0,
            enabled_methods=mfa_config.get('enabled_methods', []),
            preferred_method=mfa_config.get('preferred_method'),
            backup_codes_remaining=remaining,
            last_verified=mfa_config.get('last_verified')
        )
    
    async def regenerate_backup_codes(self, user_id: str) -> List[str]:
        """Generate new backup codes"""
        backup_codes = await self._generate_backup_codes(10)
        
        # Store new codes
        codes_docs = [
            {
                'user_id': user_id,
                'code': code,
                'used': False,
                'created_at': datetime.utcnow()
            }
            for code in backup_codes
        ]
        
        await self.backup_codes_collection.insert_many(codes_docs)
        
        # Update MFA config
        await self.mfa_collection.update_one(
            {'user_id': user_id},
            {
                '$set': {'backup_codes_used': 0, 'total_backup_codes': 10}
            }
        )
        
        return backup_codes
    
    async def _generate_backup_codes(self, count: int) -> List[str]:
        """Generate random backup codes"""
        codes = []
        for _ in range(count):
            code = '-'.join([str(secrets.randbelow(10000)).zfill(4) for _ in range(2)])
            codes.append(code)
        return codes
    
    async def _record_failed_attempt(self, user_id: str, method: MFAMethod) -> None:
        """Record failed verification attempt"""
        mfa_config = await self.mfa_collection.find_one({'user_id': user_id})
        
        if mfa_config:
            attempts = mfa_config.get('failed_attempts', 0) + 1
            
            # Lock account after 5 failed attempts
            if attempts >= 5:
                await self.db['users'].update_one(
                    {'_id': user_id},
                    {'$set': {'mfa_locked': True, 'mfa_locked_until': datetime.utcnow() + timedelta(minutes=30)}}
                )
            
            await self.mfa_collection.update_one(
                {'user_id': user_id},
                {'$set': {'failed_attempts': attempts}}
            )
