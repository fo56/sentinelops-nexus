from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
    
    # App Settings
    APP_NAME: str = "Doc-Sage Intel Console"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # MongoDB Settings
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "sentinel_ops_nexus"
    
    # AI Settings - Using Ollama
    AI_PROVIDER: str = "ollama"
    
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"  # or "llama3.2:1b", "llama3:8b"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    
    # File Storage Settings
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list = [".pdf", ".jpg", ".jpeg", ".png", ".txt"]
    
    # Tesseract OCR Settings
    TESSERACT_PATH: Optional[str] = None
    
    # CORS Settings
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # JWT Authentication Settings (Optional - for future auth module)
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # QR Token Settings
    QR_TOKEN_LENGTH: int = 32
    
    # Default Admin Credentials (for initial setup)
    DEFAULT_ADMIN_USERNAME: str = "red_ranger"
    DEFAULT_ADMIN_EMAIL: str = "admin@sentinelops.com"
    DEFAULT_ADMIN_PASSWORD: str = "morphintime2024"
    DEFAULT_ADMIN_FULLNAME: str = "Red Ranger - Team Leader"

settings = Settings()

# Configure Tesseract OCR path
def setup_tesseract():
    """Setup Tesseract OCR path for pytesseract"""
    import pytesseract
    
    # Direct path configuration
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    
    # Common Windows installation paths
    windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    
    # Check if custom path is set in .env
    if settings.TESSERACT_PATH:
        if os.path.exists(settings.TESSERACT_PATH):
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
            print(f"[OK] Tesseract configured at: {settings.TESSERACT_PATH}")
        else:
            print(f"[WARN] Tesseract path not found: {settings.TESSERACT_PATH}")
    # Windows - try common installation paths
    elif os.name == 'nt':
        for path in windows_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"[OK] Tesseract found at: {path}")
                return
        print("[WARN] Tesseract not found in common Windows paths")
        print("   Install from: https://github.com/UB-Mannheim/tesseract/wiki")
    else:
        # macOS/Linux - tesseract should be in PATH
        print("[OK] Tesseract OCR should be available in PATH (macOS/Linux)")

# Call setup on import
setup_tesseract()