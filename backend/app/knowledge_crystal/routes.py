"""
Knowledge Crystal API Routes
Endpoints for KB creation, search, and Q&A
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import (
    KBPageCreate, KBPageUpdate, KBPageResponse,
    SearchQuery, SearchResult,
    KBDocumentUpload, ChatQueryRequest, ChatQueryResponse, DocumentCategory
)
from .services import (
    KBPageService, KBSearchService,
    KBChatService, KBDocumentService
)
from app.utils.dependencies import get_db, get_current_user

router = APIRouter(prefix="/kb", tags=["knowledge-crystal"])


@router.post("/create", response_model=dict)
async def create_kb_page(
    page_data: KBPageCreate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new knowledge page and generate embeddings
    
    STEP 1: Creates KB page in MongoDB
    STEP 2: Chunks content and generates embeddings with Ollama
    STEP 3: Stores chunks in vector DB (ChromaDB)
    """
    service = KBPageService(db)
    result = await service.create_page(page_data)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {
        "message": "Knowledge page created successfully",
        "data": result
    }


@router.get("/page/{page_id}", response_model=dict)
async def get_kb_page(
    page_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve a knowledge page by ID"""
    service = KBPageService(db)
    page = await service.get_page(page_id)
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {
        "data": page
    }


@router.get("/pages", response_model=dict)
async def list_kb_pages(
    category: Optional[str] = Query(None, description="Filter by category: agent or technician"),
    visibility: Optional[str] = Query(None, description="Filter by visibility (public/private)"),
    country: Optional[str] = Query(None, description="Filter by country (for agent documents)"),
    mission_id: Optional[str] = Query(None, description="Filter by mission ID"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    limit: int = Query(10, ge=1, le=50),
    skip: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    List knowledge pages with optional filters
    
    Supports filtering by:
    - Category (agent/technician) for role-based access
    - Country for agent mission documents
    - Mission ID for specific missions
    - Tags for categorization
    - Visibility (public/private)
    """
    service = KBPageService(db)
    
    # Build query filters
    query = {}
    user_role = current_user.get("role", "agent")
    
    if user_role == "admin":
        if category and category.lower() != "all":
            query["category"] = category
    else:
        query["category"] = user_role
    if visibility:
        query["visibility"] = visibility
    if country:
        query["country"] = country
    if mission_id:
        query["mission_id"] = mission_id
    if tags:
        query["tags"] = {"$in": tags}
    
    pages = await service.collection.find(query) \
        .skip(skip) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await service.collection.count_documents(query)
    
    # Convert ObjectId to string
    for page in pages:
        page["_id"] = str(page["_id"])
    
    return {
        "pages": pages,
        "total": total,
        "limit": limit,
        "skip": skip,
        "filters": {
            "category": category,
            "country": country,
            "mission_id": mission_id,
            "visibility": visibility,
            "tags": tags
        }
    }


@router.put("/page/{page_id}", response_model=dict)
async def update_kb_page(
    page_id: str,
    update_data: KBPageUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a knowledge page (re-indexes if content changed)"""
    service = KBPageService(db)
    result = await service.update_page(page_id, update_data)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {
        "message": "Page updated successfully",
        "data": result
    }


@router.delete("/page/{page_id}", response_model=dict)
async def delete_kb_page(
    page_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a knowledge page and its chunks"""
    service = KBPageService(db)
    result = await service.delete_page(page_id)
    
    return {
        "message": "Page deleted successfully",
        "data": result
    }


@router.get("/search", response_model=dict)
async def semantic_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=20),
    category: Optional[str] = Query(None, description="Filter by category: agent or technician"),
    country: Optional[str] = Query(None, description="Filter by country (for agent documents)"),
    tags: Optional[List[str]] = Query(None),
    visibility: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Perform semantic search on knowledge pages with role-based filtering
    
    This endpoint searches for documents based on:
    - Natural language query (semantic search)
    - Category (agent or technician) for role-based access
    - Country filter for agent mission documents
    - Tags for additional filtering
    
    Returns:
    - Document ID
    - Mission ID (if applicable)
    - Country (if applicable)
    - Long summary of the document
    - Matched points from the query
    """
    # Enforce RBAC filtering
    user_role = current_user.get("role", "agent")
    
    if user_role == "admin":
        # Admins can query any category if specified, otherwise global
        doc_category = None
        if category:
            if category.lower() == "agent":
                doc_category = DocumentCategory.AGENT
            elif category.lower() == "technician":
                doc_category = DocumentCategory.TECHNICIAN
    elif user_role == "technician":
        doc_category = DocumentCategory.TECHNICIAN
    else:
        doc_category = DocumentCategory.AGENT
    
    search_query = SearchQuery(
        query=q,
        limit=limit,
        category=doc_category,
        country=country,
        tags=tags,
        visibility=visibility
    )
    
    service = KBSearchService(db)
    results = await service.search(search_query, limit=limit)
    
    return {
        "query": q,
        "category": category,
        "country": country,
        "results_count": len(results),
        "results": results
    }


@router.post("/chat")
async def kb_chat(
    chat_req: ChatQueryRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    NLP-based chat interface for Knowledge Crystal (Streaming)
    """
    # Override user_role securely from token
    chat_req.user_role = current_user.get("role", "agent")
    
    service = KBChatService(db)
    
    return StreamingResponse(
        service.chat_query_stream(chat_req),
        media_type="text/event-stream"
    )



@router.post("/upload-document", response_model=dict)
async def upload_document(
    doc_upload: KBDocumentUpload,
    file_content: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document to Knowledge Crystal (Admin only)
    
    This endpoint allows administrators to add documents to the Knowledge Crystal:
    
    For Agent Documents:
    - Mission-related documents from previous operations
    - Include mission_id and country for better organization
    - Agents can query these to learn from previous missions
    
    For Technician Documents:
    - Technical documentation for HQ equipment
    - Setup guides, working principles, troubleshooting
    - Examples: CCTV setup, door lock configuration, fingerprint sensors
    
    The document will be:
    1. Processed and indexed
    2. Chunked for vector search
    3. Made searchable via the chat interface
    """
    service = KBDocumentService(db)
    result = await service.process_uploaded_document(
        file_content=file_content,
        doc_upload=doc_upload,
        uploaded_by=current_user.get("email", "unknown")
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {
        "message": "Document uploaded and indexed successfully",
        "data": result
    }


@router.get("/stats", response_model=dict)
async def get_kb_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get statistics about the knowledge base"""
    service = KBPageService(db)
    
    total_pages = await service.collection.count_documents({})
    agent_docs = await service.collection.count_documents({"category": "agent"})
    technician_docs = await service.collection.count_documents({"category": "technician"})
    public_pages = await service.collection.count_documents({"visibility": "public"})
    private_pages = await service.collection.count_documents({"visibility": "private"})
    
    # Get tags
    tags_result = await service.collection.aggregate([
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(length=20)
    
    # Get countries (for agent documents)
    countries_result = await service.collection.aggregate([
        {"$match": {"category": "agent", "country": {"$ne": None}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(length=20)
    
    return {
        "total_pages": total_pages,
        "agent_documents": agent_docs,
        "technician_documents": technician_docs,
        "public_pages": public_pages,
        "private_pages": private_pages,
        "top_tags": tags_result,
        "countries": countries_result
    }


@router.get("/health", response_model=dict)
async def kb_health():
    """Health check for Knowledge Crystal service"""
    return {
        "status": "healthy",
        "service": "knowledge-crystal",
        "version": "2.0",
        "features": [
            "document_upload",
            "role_based_access_control",
            "nlp_chat_interface",
            "mission_document_library",
            "technical_documentation_center",
            "vector_embeddings",
            "semantic_search",
            "rag_qa_engine"
        ],
        "supported_roles": ["agent", "technician"],
        "document_categories": ["agent", "technician"]
    }
