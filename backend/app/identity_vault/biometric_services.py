"""
Biometric Authentication Services
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Tuple, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from .biometric_models import BiometricType, BiometricStatus, BiometricAuditLog


class BiometricService:
    """Biometric Authentication Service"""
    
    def __init__(self, db):
        self.db = db
        self.enrollments_collection = db['biometric_enrollments']
        self.audit_collection = db['biometric_audit_logs']
        self.devices_collection = db['biometric_devices']
        self.CONFIDENCE_THRESHOLD = 0.95  # 95% confidence for verification
    
    async def enroll_biometric(
        self, 
        user_id: str, 
        biometric_type: BiometricType,
        biometric_data: str,
        device_id: Optional[str] = None,
        is_primary: bool = False
    ) -> Tuple[bool, str, float]:
        """
        Enroll new biometric for user
        Returns: (success, message, confidence_score)
        """
        try:
            # Calculate biometric template (hash + quality)
            template = hashlib.sha256(biometric_data.encode()).hexdigest()
            confidence_score = await self._calculate_quality(biometric_data)
            
            if confidence_score < 0.8:
                return False, "Biometric quality too low. Please try again.", confidence_score
            
            # Check for duplicate enrollments
            existing = await self.enrollments_collection.find_one({
                'user_id': user_id,
                'biometric_type': biometric_type.value,
                'status': 'active'
            })
            
            if existing and not is_primary:
                return False, f"{biometric_type.value} already enrolled for this user", confidence_score
            
            # Store enrollment
            enrollment_doc = {
                'user_id': user_id,
                'biometric_type': biometric_type.value,
                'biometric_data': template,
                'enrollment_date': datetime.utcnow(),
                'confidence_score': confidence_score,
                'device_id': device_id,
                'is_primary': is_primary,
                'failed_matches': 0,
                'successful_matches': 0,
                'status': 'active'
            }
            
            result = await self.enrollments_collection.insert_one(enrollment_doc)
            
            # Update user's biometric status if primary
            if is_primary:
                await self.db['users'].update_one(
                    {'_id': user_id},
                    {
                        '$set': {
                            'primary_biometric': biometric_type.value,
                            'biometric_enabled': True
                        }
                    }
                )
            
            return True, f"{biometric_type.value} enrolled successfully", confidence_score
        
        except Exception as e:
            return False, f"Enrollment failed: {str(e)}", 0.0
    
    async def verify_biometric(
        self,
        user_id: str,
        biometric_type: BiometricType,
        biometric_data: str,
        device_id: Optional[str] = None
    ) -> Tuple[bool, float, str]:
        """
        Verify biometric
        Returns: (verified, confidence_score, message)
        """
        try:
            # Get enrolled biometric
            enrollment = await self.enrollments_collection.find_one({
                'user_id': user_id,
                'biometric_type': biometric_type.value,
                'status': 'active'
            })
            
            if not enrollment:
                return False, 0.0, f"No {biometric_type.value} enrolled for this user"
            
            # Calculate template for verification data
            verify_template = hashlib.sha256(biometric_data.encode()).hexdigest()
            quality_score = await self._calculate_quality(biometric_data)
            
            # Compare templates (in production, use advanced biometric comparison)
            similarity = await self._compare_templates(
                enrollment['biometric_data'],
                verify_template
            )
            
            # Log attempt
            await self._log_biometric_attempt(
                user_id,
                biometric_type,
                similarity >= self.CONFIDENCE_THRESHOLD,
                similarity,
                device_id
            )
            
            if similarity >= self.CONFIDENCE_THRESHOLD:
                # Update success stats
                await self.enrollments_collection.update_one(
                    {'_id': enrollment['_id']},
                    {
                        '$inc': {'successful_matches': 1},
                        '$set': {'last_used': datetime.utcnow()}
                    }
                )
                
                # Update user's last biometric verification
                await self.db['users'].update_one(
                    {'_id': user_id},
                    {'$set': {'last_biometric_verification': datetime.utcnow()}}
                )
                
                return True, similarity, "Biometric verification successful"
            
            else:
                # Update failed stats
                await self.enrollments_collection.update_one(
                    {'_id': enrollment['_id']},
                    {'$inc': {'failed_matches': 1}}
                )
                
                return False, similarity, "Biometric verification failed"
        
        except Exception as e:
            return False, 0.0, f"Verification error: {str(e)}"
    
    async def disable_biometric(
        self,
        user_id: str,
        biometric_type: BiometricType
    ) -> bool:
        """Disable biometric authentication"""
        result = await self.enrollments_collection.update_one(
            {
                'user_id': user_id,
                'biometric_type': biometric_type.value
            },
            {'$set': {'status': 'disabled'}}
        )
        
        # Check if any active biometrics remain
        active_count = await self.enrollments_collection.count_documents({
            'user_id': user_id,
            'status': 'active'
        })
        
        if active_count == 0:
            await self.db['users'].update_one(
                {'_id': user_id},
                {'$set': {'biometric_enabled': False}}
            )
        
        return result.modified_count > 0
    
    async def get_biometric_status(self, user_id: str) -> BiometricStatus:
        """Get user's biometric status"""
        enrollments = await self.enrollments_collection.find(
            {'user_id': user_id, 'status': 'active'}
        ).to_list(None)
        
        user = await self.db['users'].find_one({'_id': user_id})
        
        enrolled_types = [
            BiometricType[e['biometric_type'].upper()]
            for e in enrollments
        ]
        
        devices = list(set(e.get('device_id') for e in enrollments if e.get('device_id')))
        
        return BiometricStatus(
            user_id=user_id,
            biometric_enabled=user.get('biometric_enabled', False) if user else False,
            enrolled_types=enrolled_types,
            primary_biometric=user.get('primary_biometric') if user else None,
            total_enrollments=len(enrollments),
            last_verification=user.get('last_biometric_verification') if user else None,
            devices=devices
        )
    
    async def register_device(
        self,
        user_id: str,
        device_name: str,
        device_type: str
    ) -> Tuple[str, datetime]:
        """Register biometric device for user"""
        device_id = secrets.token_urlsafe(16)
        expires_at = datetime.utcnow() + timedelta(days=90)
        
        device_doc = {
            'user_id': user_id,
            'device_id': device_id,
            'device_name': device_name,
            'device_type': device_type,
            'registered_at': datetime.utcnow(),
            'expires_at': expires_at,
            'last_used': None,
            'status': 'active'
        }
        
        await self.devices_collection.insert_one(device_doc)
        
        return device_id, expires_at
    
    async def list_devices(self, user_id: str) -> List[dict]:
        """List registered biometric devices"""
        devices = await self.devices_collection.find(
            {'user_id': user_id, 'status': 'active'},
            {'_id': 0, 'user_id': 0}
        ).to_list(None)
        
        return devices
    
    async def revoke_device(self, user_id: str, device_id: str) -> bool:
        """Revoke device access"""
        result = await self.devices_collection.update_one(
            {'user_id': user_id, 'device_id': device_id},
            {'$set': {'status': 'revoked', 'revoked_at': datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    async def _calculate_quality(self, biometric_data: str) -> float:
        """
        Calculate biometric quality score
        In production, integrate with real biometric SDKs
        """
        # Simplified quality calculation based on data length and format
        quality = min(1.0, len(biometric_data) / 1000.0)
        
        # Add randomness for demo (in production, use actual SDK)
        import random
        quality = quality * (0.9 + random.random() * 0.1)
        
        return round(quality, 3)
    
    async def _compare_templates(self, template1: str, template2: str) -> float:
        """
        Compare two biometric templates
        Returns confidence score
        """
        # Simplified comparison (in production, use advanced algorithms)
        if template1 == template2:
            return 1.0
        
        # Calculate similarity
        matches = sum(c1 == c2 for c1, c2 in zip(template1, template2))
        similarity = matches / max(len(template1), len(template2))
        
        return round(similarity, 3)
    
    async def _log_biometric_attempt(
        self,
        user_id: str,
        biometric_type: BiometricType,
        verified: bool,
        confidence_score: float,
        device_id: Optional[str],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log biometric verification attempt"""
        log_doc = {
            'user_id': user_id,
            'biometric_type': biometric_type.value,
            'verification_result': verified,
            'confidence_score': confidence_score,
            'device_id': device_id,
            'timestamp': datetime.utcnow(),
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        await self.audit_collection.insert_one(log_doc)
