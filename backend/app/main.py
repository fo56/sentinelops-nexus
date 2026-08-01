from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.knowledge_crystal.routes import router as kb_router
from app.knowledge_crystal.embedding_service import init_embedding_service
from app.knowledge_crystal.vector_store import init_vector_store
from app.identity_vault.auth_routes import router as auth_router
from app.identity_vault.admin_routes import router as admin_router
from app.identity_vault.mfa_routes import router as mfa_router
from app.identity_vault.biometric_routes import router as biometric_router
from app.analytics.routes import router as analytics_router
from app.notifications.routes import router as notifications_router
from app.ops_planner.routes import router as ops_planner_router
from app.facility_ops.routes import router as facility_ops_router

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Power Rangers Sentinel"
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
    print("✅ MongoDB connected!")
    
    # Initialize Knowledge Crystal services
    print("🔮 Initializing Knowledge Crystal...")
    try:
        init_embedding_service()
        print("✅ Embedding Service initialized")
        
        init_vector_store()
        print("✅ Vector Store initialized")
    except Exception as e:
        print(f"⚠️ Knowledge Crystal initialization warning: {e}")
    
    print("✅ Doc-Sage & Knowledge Crystal are ready!")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(kb_router)

# Phase 3 Routers
app.include_router(mfa_router)
app.include_router(biometric_router)
app.include_router(analytics_router)

# Phase 4 Routers
app.include_router(notifications_router)

# Phase 5 Routers
app.include_router(ops_planner_router)

# Phase 6 Routers
app.include_router(facility_ops_router)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "🎯 Doc-Sage Intel Console API",
        "status": "online",
        "version": settings.APP_VERSION
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "doc-sage"}