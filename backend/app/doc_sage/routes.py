"""
DocSage API Routes - Updated with Mission-based Access and Chat
Endpoints for document upload, processing, search, and AI chat
"""

import logging
import os
import asyncio
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends, Form
from bson import ObjectId
from app.config.settings import settings
from app.doc_sage.models import (
    DocumentUploadResponse, 
    DocumentDetail, 
    SearchResponse,
    SearchResult,
    ErrorResponse,
    ChatRequest,
    ChatResponse,
    ChatHistory,
    DocumentAccessRequest,
    DocumentAccessResponse
)
from app.doc_sage.services import document_service, chat_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/docsage", tags=["DocSage"])


def _ensure_upload_dir():
    """Ensure upload directory exists"""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/documents", exist_ok=True)


# ==================== DOCUMENT UPLOAD & MANAGEMENT ====================

@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    summary="Upload a document with optional mission assignment"
)
async def upload_document(
    file: UploadFile = File(...),
    mission_id: Optional[str] = Form(None),
    uploaded_by: str = Form(settings.DEFAULT_ADMIN_EMAIL),
    allowed_users: Optional[str] = Form(None)  # Comma-separated emails
):
    """
    Upload a document for processing with optional mission assignment.
    
    - **file**: Document file (PDF, images, text)
    - **mission_id**: Optional mission ID to associate document with
    - **uploaded_by**: Email of the uploader (admin)
    - **allowed_users**: Comma-separated list of user emails who can access this document
    
    Returns document ID and processing status.
    """
    try:
        logger.info(f"📤 Uploading file: {file.filename} for mission: {mission_id}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )
        
        contents = await file.read()
        if len(contents) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds {settings.MAX_FILE_SIZE / 1024 / 1024}MB limit"
            )
        
        mime_type_map = {
            ".pdf": "application/pdf",
            ".txt": "text/plain",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
        }
        mime_type = mime_type_map.get(file_ext, "application/octet-stream")
        
        _ensure_upload_dir()
        
        # Create mission-specific folder if mission_id provided
        if mission_id:
            mission_dir = f"{settings.UPLOAD_DIR}/missions/{mission_id}"
            os.makedirs(mission_dir, exist_ok=True)
            file_path = f"{mission_dir}/{file.filename}"
        else:
            file_path = f"{settings.UPLOAD_DIR}/documents/{file.filename}"
        
        # Handle duplicate filenames
        counter = 1
        original_path = file_path
        while os.path.exists(file_path):
            name, ext = os.path.splitext(original_path)
            file_path = f"{name}_{counter}{ext}"
            counter += 1
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
        logger.info(f"✅ File saved: {file_path}")
        
        # Parse allowed users
        allowed_users_list = []
        if allowed_users:
            allowed_users_list = [email.strip() for email in allowed_users.split(",")]
        
        # Add uploader to allowed users
        if uploaded_by and uploaded_by not in allowed_users_list:
            allowed_users_list.append(uploaded_by)
        
        doc = await document_service.create_document(
            filename=os.path.basename(file_path),
            file_path=file_path,
            file_size=len(contents),
            mime_type=mime_type,
            uploaded_by=uploaded_by,
            mission_id=mission_id,
            allowed_users=allowed_users_list
        )
        
        # Start async processing
        asyncio.create_task(
            document_service.process_document_text(doc["_id"])
        )
        
        return DocumentUploadResponse(
            id=doc["_id"],
            name=doc["name"],
            status=doc["status"],
            uploaded_at=doc["uploaded_at"],
            uploaded_by=doc["uploaded_by"],
            mission_id=mission_id
        )
    
    except HTTPException as e:
        logger.error(f"❌ Upload error: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Error during upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/documents/{doc_id}",
    response_model=DocumentDetail,
    summary="Get document details with full summary and insights"
)
async def get_document_detail(
    doc_id: str,
    user_email: Optional[str] = Query(None, description="User email for access control")
):
    """
    Get complete document details including AI summary, insights, and page-level summaries.
    
    - **doc_id**: Document ID
    - **user_email**: User's email for access verification
    """
    try:
        logger.info(f"📖 Getting document: {doc_id}")
        
        if not ObjectId.is_valid(doc_id):
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        # Check access if user_email provided
        if user_email:
            has_access = await document_service.check_document_access(doc_id, user_email)
            if not has_access:
                raise HTTPException(
                    status_code=403, 
                    detail="You do not have permission to access this document"
                )
        
        doc = await document_service.get_document(doc_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentDetail(
            id=doc["_id"],
            name=doc["name"],
            status=doc["status"],
            uploaded_by=doc["uploaded_by"],
            uploaded_at=doc["uploaded_at"],
            extracted_text=doc.get("extracted_text"),
            summary=doc.get("summary"),
            insights=doc.get("insights"),
            file_size=doc["file_size"],
            mime_type=doc["mime_type"],
            mission_id=doc.get("mission_id"),
            allowed_users=doc.get("allowed_users", [])
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/documents",
    response_model=List[DocumentDetail],
    summary="Get all documents (filtered by user access)"
)
async def get_all_documents(
    user_email: Optional[str] = Query(None, description="Filter by user access"),
    mission_id: Optional[str] = Query(None, description="Filter by mission ID")
):
    """
    Get all documents with access control filtering.
    
    - **user_email**: Only return documents this user can access
    - **mission_id**: Filter documents by mission
    """
    try:
        logger.info(f"📚 Getting documents for user: {user_email}, mission: {mission_id}")
        
        if mission_id:
            docs = await document_service.get_documents_by_mission(mission_id, user_email)
        else:
            docs = await document_service.get_all_documents(user_email)
        
        return [
            DocumentDetail(
                id=doc["_id"],
                name=doc["name"],
                status=doc["status"],
                uploaded_by=doc["uploaded_by"],
                uploaded_at=doc["uploaded_at"],
                extracted_text=doc.get("extracted_text"),
                summary=doc.get("summary"),
                insights=doc.get("insights"),
                file_size=doc["file_size"],
                mime_type=doc["mime_type"],
                mission_id=doc.get("mission_id"),
                allowed_users=doc.get("allowed_users", [])
            )
            for doc in docs
        ]
    
    except Exception as e:
        logger.error(f"❌ Error getting documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/documents/{doc_id}/check-access",
    response_model=DocumentAccessResponse,
    summary="Check if user has access to document"
)
async def check_document_access(doc_id: str, request: DocumentAccessRequest):
    """
    Check if a specific user has access to a document.
    """
    try:
        if not ObjectId.is_valid(doc_id):
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        has_access = await document_service.check_document_access(doc_id, request.user_email)
        
        reason = None
        if has_access:
            reason = "User has access to this document"
        else:
            reason = "User does not have permission to access this document"
        
        return DocumentAccessResponse(
            has_access=has_access,
            reason=reason
        )
    
    except Exception as e:
        logger.error(f"❌ Error checking access: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/documents/{doc_id}/download",
    summary="Download document file"
)
async def download_document(
    doc_id: str,
    user_email: Optional[str] = Query(None, description="User email for access control")
):
    """
    Download the original document file.
    """
    try:
        from fastapi.responses import FileResponse
        
        logger.info(f"⬇️ Downloading document: {doc_id}")
        
        if not ObjectId.is_valid(doc_id):
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        # Check access if user_email provided
        if user_email:
            has_access = await document_service.check_document_access(doc_id, user_email)
            if not has_access:
                raise HTTPException(
                    status_code=403,
                    detail="You do not have permission to access this document"
                )
        
        doc = await document_service.get_document(doc_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = doc.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Document file not found")
        
        return FileResponse(
            path=file_path,
            filename=doc["name"],
            media_type=doc.get("mime_type", "application/octet-stream")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/documents/{doc_id}",
    summary="Delete document"
)
async def delete_document(doc_id: str):
    """
    Delete a document and its associated file.
    """
    try:
        logger.info(f"🗑️ Deleting document: {doc_id}")
        
        if not ObjectId.is_valid(doc_id):
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        success = await document_service.delete_document(doc_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"message": "Document deleted successfully", "id": doc_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DOCUMENT SEARCH ====================

@router.get(
    "/search",
    response_model=SearchResponse,
    summary="Search documents"
)
async def search_documents(
    q: str = Query(..., min_length=1, max_length=100),
    user_email: Optional[str] = Query(None, description="Filter by user access")
):
    """
    Search documents by content, keywords, and metadata.
    """
    try:
        logger.info(f"🔍 Searching for: {q}")
        
        results = await document_service.search_documents(q)
        
        # Filter by user access if provided
        if user_email:
            filtered_results = []
            for doc in results:
                has_access = await document_service.check_document_access(doc["_id"], user_email)
                if has_access:
                    filtered_results.append(doc)
            results = filtered_results
        
        formatted_results = []
        for doc in results:
            match_context = None
            if doc.get("extracted_text"):
                text = doc["extracted_text"]
                idx = text.lower().find(q.lower())
                if idx != -1:
                    start = max(0, idx - 50)
                    end = min(len(text), idx + len(q) + 50)
                    match_context = f"...{text[start:end]}..."
            
            formatted_results.append(
                SearchResult(
                    id=doc["_id"],
                    name=doc["name"],
                    summary=doc.get("summary", {}).get("short_summary"),
                    keywords=doc.get("summary", {}).get("keywords", []),
                    uploaded_by=doc["uploaded_by"],
                    uploaded_at=doc["uploaded_at"],
                    match_context=match_context
                )
            )
        
        return SearchResponse(
            query=q,
            total_results=len(formatted_results),
            results=formatted_results
        )
    
    except Exception as e:
        logger.error(f"❌ Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AI CHAT FUNCTIONALITY ====================

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Ask questions about a document"
)
async def chat_with_document(request: ChatRequest, user_email: str = Query(...)):
    """
    Chat with a document using AI.
    
    - **document_id**: Document to ask about
    - **question**: User's question
    - **include_history**: Whether to include previous chat context
    - **user_email**: User's email for access control
    """
    try:
        logger.info(f"💬 Chat request for doc {request.document_id}: {request.question[:50]}...")
        
        if not ObjectId.is_valid(request.document_id):
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        # Check access
        has_access = await document_service.check_document_access(request.document_id, user_email)
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this document"
            )
        
        # Get answer
        response = await chat_service.answer_question(
            document_id=request.document_id,
            user_id=user_email,
            question=request.question,
            include_history=request.include_history
        )
        
        return ChatResponse(
            answer=response["answer"],
            sources=response["sources"],
            timestamp=response["timestamp"]
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/chat/history/{document_id}",
    response_model=ChatHistory,
    summary="Get chat history for a document"
)
async def get_chat_history(document_id: str, user_email: str = Query(...)):
    """
    Get the chat history for a specific document and user.
    """
    try:
        logger.info(f"📜 Getting chat history for doc {document_id}, user {user_email}")
        
        if not ObjectId.is_valid(document_id):
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        # Check access
        has_access = await document_service.check_document_access(document_id, user_email)
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this document"
            )
        
        history = await chat_service.get_chat_history(document_id, user_email)
        
        return ChatHistory(
            document_id=history["document_id"],
            mission_id=history.get("mission_id"),
            user_id=history["user_id"],
            messages=history["messages"],
            created_at=history["created_at"],
            updated_at=history["updated_at"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== HEALTH CHECK ====================

@router.get("/health", summary="Health check")
async def health_check():
    """Check if DocSage service is running"""
    return {
        "status": "healthy",
        "service": "DocSage",
        "version": "2.0"
    }
