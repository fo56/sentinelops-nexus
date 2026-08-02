from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
    
    # App Settings
    APP_NAME: str = "SentinelOps Nexus API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # MongoDB Settings
    MONGODB_URL: str = "mongodb://127.0.0.1:27017"
    MONGODB_DB_NAME: str = "sentinel_ops_nexus"
    
    # AI Settings - Using Ollama
    AI_PROVIDER: str = "ollama"
    
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2:1b"  # Much faster on CPU than 3b
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    
    # File Storage Settings
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list = [".pdf", ".jpg", ".jpeg", ".png", ".txt"]
        
    # CORS Settings
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # JWT Authentication Settings (Optional - for future auth module)
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Default Admin Credentials (for initial setup)
    DEFAULT_ADMIN_USERNAME: str = "red_ranger"
    DEFAULT_ADMIN_EMAIL: str = "admin@sentinelops.com"
    DEFAULT_ADMIN_PASSWORD: str = "AdminPassword123!"
    DEFAULT_ADMIN_FULLNAME: str = "Red Ranger - Team Leader"

settings = Settings()