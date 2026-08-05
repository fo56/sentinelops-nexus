"""
MongoDB Database Connection Manager
Handles async connection to LOCAL MongoDB using Motor
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    db = None


db = Database()


async def connect_to_mongo():
    """Establish connection to local MongoDB"""
    try:
        # Simple connection to local MongoDB (no SSL)
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db.db = db.client[settings.MONGODB_DB_NAME]
        
        # Test connection
        await db.client.server_info()
        logger.info(" Successfully connected to MongoDB")
        logger.info(f" Database: {settings.MONGODB_DB_NAME}")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error(f" Failed to connect to MongoDB: {e}")
        logger.error(" Make sure MongoDB service is running: net start MongoDB")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        logger.info(" MongoDB connection closed")


async def create_indexes():
    """Create database indexes for better performance"""
    try:
        # Users collection indexes
        await db.db.users.create_index("email", unique=True)

        
        # Identity logs collection indexes
        await db.db.identity_logs.create_index("email")
        await db.db.identity_logs.create_index("timestamp")
        await db.db.identity_logs.create_index([("timestamp", -1)])
        
        logger.info("[OK] Database indexes created successfully")
    except Exception as e:
        logger.warning(f"[WARN] Index creation warning: {e}")


def get_database():
    """Get database instance"""
    return db.db
