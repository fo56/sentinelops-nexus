from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.knowledge_crystal.routes import router as kb_router
from app.knowledge_crystal.embedding_service import init_embedding_service
from app.knowledge_crystal.vector_store import init_vector_store
from app.identity_vault.auth_routes import router as auth_router
from app.identity_vault.admin_routes import router as admin_router

from app.ops_planner.routes import router as ops_planner_router
from app.facility_ops.routes import router as facility_ops_router

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SentinelOps Nexus"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    print("[OK] MongoDB connected!")
    
    # Initialize Knowledge Crystal services
    print("[INFO] Initializing Knowledge Crystal...")
    try:
        init_embedding_service()
        print("[OK] Embedding Service initialized")
        
        init_vector_store()
        print("[OK] Vector Store initialized")
    except Exception as e:
        print(f"[WARN] Knowledge Crystal initialization warning: {e}")
    
    print("[OK] Knowledge Crystal is ready!")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(kb_router)

app.include_router(ops_planner_router)
app.include_router(facility_ops_router)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "SentinelOps Nexus",
        "status": "online",
        "version": settings.APP_VERSION
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "sentinelops-nexus"}