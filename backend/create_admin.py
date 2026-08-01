"""
Quick Admin Creation Script
Run this to create the admin user in MongoDB
"""

import asyncio
import sys
from datetime import datetime
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from passlib.context import CryptContext

async def create_admin():
    """Create admin user directly in MongoDB"""
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    users_collection = db['users']
    
    try:
        # Delete existing admin if any to ensure clean state
        await users_collection.delete_many({'email': settings.DEFAULT_ADMIN_EMAIL})
        
        # Hash password
        pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
        hashed_password = pwd_context.hash(settings.DEFAULT_ADMIN_PASSWORD)
        
        # Create admin user
        admin_data = {
            'email': settings.DEFAULT_ADMIN_EMAIL,
            'password': hashed_password,
            'full_name': settings.DEFAULT_ADMIN_FULLNAME,
            'role': 'admin',
            'status': 'active',
            'age': 35,
            'marital_status': 'single',
            'criminal_record': False,
            'health_issues': False,
            'created_at': datetime.utcnow(),
            'last_login': None,
            'last_logout': None,
            'permissions': {
                "create_users": True,
                "view_all_data": True,
                "view_missions": True,
                "fix_issues": True,
                "upload_evidence": True,
                "manage_facilities": True,
                "access_knowledge_base": True
            },
            "completed_missions": 0,
            "failed_missions": 0
        }
        
        result = await users_collection.insert_one(admin_data)
        print("=========================================")
        print("ADMIN USER CREATED SUCCESSFULLY")
        print("=========================================")
        print(f"Email: {settings.DEFAULT_ADMIN_EMAIL}")
        print(f"Password: {settings.DEFAULT_ADMIN_PASSWORD}")
        print("=========================================")
        print(f"   ID: {result.inserted_id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
