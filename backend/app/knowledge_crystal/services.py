"""
Knowledge Crystal Services
Core business logic for KB operations
"""
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from .models import (
    KBPageCreate, KBPageUpdate, KBPageResponse,
    SearchQuery, SearchResult, QueryRequest, QueryResponse,
    KBDocumentUpload, ChatQueryRequest, ChatQueryResponse, DocumentCategory
)
from .embedding_service import get_embedding_service
from .vector_store import get_vector_store


class KBPageService:
    """Service for managing knowledge pages"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection: AsyncIOMotorCollection = db["kb_pages"]
    
    async def create_page(self, page_data: KBPageCreate) -> Dict[str, Any]:
        """
        Create a new knowledge page and generate embeddings
        
        Args:
            page_data: KB page creation data
        
        Returns:
            Created page document
        """
        embedding_service = get_embedding_service()
        vector_store = get_vector_store()
        
        # Process content: chunk and embed
        try:
            chunks, embeddings = embedding_service.process_content(page_data.content)
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to process content: {str(e)}"
            }
        
        # Generate summary
        long_summary = await self._generate_summary(page_data.content)
        
        # Create page document
        page_doc = {
            "_id": ObjectId(),
            "title": page_data.title,
            "content": page_data.content,
            "long_summary": long_summary,
            "category": page_data.category,
            "mission_id": page_data.mission_id,
            "country": page_data.country,
            "tags": page_data.tags,
            "visibility": page_data.visibility,
            "author": page_data.author,
            "metadata": page_data.metadata or {},
            "status": "indexing",
            "chunk_count": len(chunks),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Save page to MongoDB
        result = await self.collection.insert_one(page_doc)
        page_id = str(result.inserted_id)
        
        # Add chunks to vector store
        # Note: ChromaDB only accepts scalar values (str, int, float, bool) in metadata
        # Convert lists to comma-separated strings
        metadata = [
            {
                "page_id": page_id,
                "category": page_data.category,
                "mission_id": page_data.mission_id or "",
                "country": page_data.country or "",
                "visibility": page_data.visibility,
                "author": page_data.author,
                "tags": ",".join(page_data.tags) if page_data.tags else ""
            }
            for _ in chunks
        ]
        
        vector_result = vector_store.add_chunks(
            page_id=page_id,
            chunks=chunks,
            title=page_data.title,
            embeddings=embeddings,
            metadata=metadata
        )
        
        if not vector_result.get("success"):
            # Update status to error
            await self.collection.update_one(
                {"_id": result.inserted_id},
                {"$set": {"status": "error"}}
            )
            return {
                "success": False,
                "error": f"Failed to index chunks: {vector_result.get('error')}"
            }
        
        # Update status to indexed
        await self.collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"status": "indexed"}}
        )
        
        return {
            "success": True,
            "page_id": page_id,
            "chunks_created": len(chunks),
            "title": page_data.title,
            "created_at": page_doc["created_at"]
        }
    
    async def get_page(self, page_id: str) -> Optional[Dict[str, Any]]:
        """Get a knowledge page by ID"""
        try:
            page = await self.collection.find_one({"_id": ObjectId(page_id)})
            if page:
                page["_id"] = str(page["_id"])
            return page
        except Exception as e:
            print(f" Error fetching page: {e}")
            return None
    
    async def update_page(self, page_id: str, update_data: KBPageUpdate) -> Dict[str, Any]:
        """
        Update a knowledge page (re-indexes if content changed)
        
        Args:
            page_id: ID of page to update
            update_data: Update data
        
        Returns:
            Update result
        """
        embedding_service = get_embedding_service()
        vector_store = get_vector_store()
        
        # Get existing page
        existing_page = await self.get_page(page_id)
        if not existing_page:
            return {"success": False, "error": "Page not found"}
        
        # If content changed, re-index
        if update_data.content and update_data.content != existing_page.get("content"):
            # Delete old chunks
            vector_store.delete_chunks(page_id)
            
            # Generate new chunks and embeddings
            try:
                chunks, embeddings = embedding_service.process_content(update_data.content)
            except Exception as e:
                return {"success": False, "error": f"Failed to process content: {str(e)}"}
            
            # Add new chunks
            title = update_data.title or existing_page.get("title")
            tags = update_data.tags or existing_page.get("tags", [])
            metadata = [
                {
                    "page_id": page_id,
                    "category": existing_page.get("category", ""),
                    "mission_id": existing_page.get("mission_id", "") or "",
                    "country": existing_page.get("country", "") or "",
                    "visibility": update_data.visibility or existing_page.get("visibility"),
                    "author": existing_page.get("author"),
                    "tags": ",".join(tags) if isinstance(tags, list) else tags
                }
                for _ in chunks
            ]
            
            vector_result = vector_store.add_chunks(
                page_id=page_id,
                chunks=chunks,
                title=title,
                embeddings=embeddings,
                metadata=metadata
            )
            
            if not vector_result.get("success"):
                return {"success": False, "error": "Failed to re-index content"}
        
        # Update MongoDB document
        update_fields = {}
        if update_data.title:
            update_fields["title"] = update_data.title
        if update_data.content:
            update_fields["content"] = update_data.content
        if update_data.tags is not None:
            update_fields["tags"] = update_data.tags
        if update_data.visibility:
            update_fields["visibility"] = update_data.visibility
        if update_data.metadata:
            update_fields["metadata"] = update_data.metadata
        
        update_fields["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(page_id)},
            {"$set": update_fields}
        )
        
        return {
            "success": True,
            "modified_count": result.modified_count,
            "page_id": page_id
        }
    
    async def delete_page(self, page_id: str) -> Dict[str, Any]:
        """Delete a knowledge page and its chunks"""
        vector_store = get_vector_store()
        
        # Delete chunks from vector store
        vector_store.delete_chunks(page_id)
        
        # Delete from MongoDB
        result = await self.collection.delete_one({"_id": ObjectId(page_id)})
        
        return {
            "success": True,
            "deleted_count": result.deleted_count
        }

    async def _generate_summary(self, content: str) -> str:
        """Generate a detailed summary of the document using Ollama"""
        import requests
        from app.config.settings import settings
        
        try:
            prompt = f"""Generate a comprehensive summary (150-200 words) of the following document:

{content[:4000]}

Provide a detailed summary that captures the main topics, key information, and important details."""
            
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 250,
                        "temperature": 0.1
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                return response.json()["response"].strip()
            else:
                return content[:500]
        except Exception as e:
            return content[:500]


class KBSearchService:
    """Service for semantic search"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.page_collection: AsyncIOMotorCollection = db["kb_pages"]
    
    async def search(
        self,
        query: SearchQuery,
        limit: int = 5
    ) -> List[SearchResult]:
        """
        Perform semantic search on knowledge pages with role-based filtering
        
        Args:
            query: Search query with filters
            limit: Number of results to return
        
        Returns:
            List of search results with document info and matched points
        """
        embedding_service = get_embedding_service()
        vector_store = get_vector_store()
        
        # Generate query embedding
        try:
            query_embedding = embedding_service.embed_query(query.query)
        except Exception as e:
            print(f" Failed to embed query: {e}")
            return []
        
        # Build vector store filters for category
        vector_filters = {}
        if query.category:
            vector_filters["category"] = query.category
        
        # Search vector store with category filter applied at vector level
        chunks = vector_store.search(
            query_embedding, 
            limit=limit * 3,  # Get more chunks for additional filtering
            filters=vector_filters if vector_filters else None
        )
        
        results = []
        seen_pages = set()
        
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            page_id = metadata.get("page_id")
            
            # Skip if we've already processed this page
            if page_id in seen_pages:
                continue
            
            # Filter by country if specified (additional filter beyond vector search)
            if query.country and metadata.get("country") != query.country:
                continue
            
            # Get page details - gracefully handle invalid or stale ObjectIds from ChromaDB
            try:
                page_oid = ObjectId(page_id)
            except Exception:
                continue
                
            page = await self.page_collection.find_one({"_id": page_oid})
            if not page:
                continue
            
            # Apply visibility filter
            if query.visibility and page.get("visibility") != query.visibility:
                continue
            
            # Apply tags filter
            if query.tags:
                page_tags = set(page.get("tags", []))
                query_tags = set(query.tags)
                if not page_tags.intersection(query_tags):
                    continue
            
            seen_pages.add(page_id)
            
            # Get pre-computed summary (fallback to first 200 chars if missing)
            long_summary = page.get("long_summary")
            if not long_summary:
                long_summary = page.get("content", "")[:200] + "..."
            
            # Use the raw vector chunk as the matched point
            chunk_content = chunk.get("content", "").strip()
            matched_points = [chunk_content[:500] + "..." if len(chunk_content) > 500 else chunk_content]
            
            result = SearchResult(
                document_id=str(page["_id"]),
                title=page.get("title", ""),
                mission_id=page.get("mission_id"),
                country=page.get("country"),
                long_summary=long_summary,
                matched_points=matched_points,
                category=page.get("category", ""),
                tags=page.get("tags", []),
                similarity_score=chunk.get("similarity_score", 0),
                author=page.get("author", "unknown")
            )
            results.append(result)
            
            if len(results) >= limit:
                break
        
        return results


class KBRAGService:
    """Service for Retrieval-Augmented Generation (Q&A)"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.page_collection: AsyncIOMotorCollection = db["kb_pages"]
        self.search_service = KBSearchService(db)
    
    async def query(self, query_req: QueryRequest) -> QueryResponse:
        """
        Answer a question using RAG pipeline
        
        Args:
            query_req: Query request with question
        
        Returns:
            Query response with answer and sources
        """
        # Search for relevant chunks
        search_query = SearchQuery(
            query=query_req.question,
            limit=query_req.limit,
            tags=query_req.tags,
            visibility=query_req.visibility
        )
        
        sources = await self.search_service.search(search_query, limit=query_req.limit)
        
        if not sources:
            return QueryResponse(
                answer="No relevant information found in the knowledge base.",
                sources=[],
                confidence=0.0,
                model_used=settings.OLLAMA_MODEL
            )
        
        # Prepare context from retrieved chunks
        context = "\n".join([
            f"[Source: {s.title}]\n{s.chunk_snippet}\n"
            for s in sources
        ])
        
        # Create RAG prompt
        rag_prompt = f"""You are a helpful assistant. Answer the following question using ONLY the provided context. 
If the answer is not in the context, say "I don't have enough information to answer this question."

Context:
{context}

Question: {query_req.question}

Please provide a clear, concise answer citing the relevant sources."""
        
        try:
            # Generate answer using Ollama
            import requests
            
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": rag_prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 500,
                        "temperature": 0.1
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                answer = response.json()["response"].strip()
            else:
                answer = f"Error: Ollama API returned status {response.status_code}"
            
            # Calculate confidence based on similarity scores
            avg_confidence = sum(s.similarity_score for s in sources) / len(sources) if sources else 0
            
            return QueryResponse(
                answer=answer,
                sources=sources,
                confidence=min(1.0, avg_confidence),
                model_used=settings.OLLAMA_MODEL
            )
        
        except Exception as e:
            print(f" Error generating answer: {e}")
            return QueryResponse(
                answer=f"Error generating answer: {str(e)}",
                sources=sources,
                confidence=0.0,
                model_used=settings.OLLAMA_MODEL
            )


class KBChatService:
    """Service for NLP-based chat queries with role-based access control"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.search_service = KBSearchService(db)
    
    async def chat_query(self, chat_req: ChatQueryRequest) -> ChatQueryResponse:
        """
        Process natural language queries and return relevant documents
        
        Args:
            chat_req: Chat query request with NLP query and user role
        
        Returns:
            Chat response with matched documents and AI-generated answer
        """
        # Determine category based on user role
        category = None
        if chat_req.user_role:
            if chat_req.user_role.lower() == "agent":
                category = DocumentCategory.AGENT
            elif chat_req.user_role.lower() == "technician":
                category = DocumentCategory.TECHNICIAN
            elif chat_req.user_role.lower() == "admin":
                category = None  # Admins search everything
            else:
                category = DocumentCategory.AGENT  # Fallback
        
        # Create search query with role-based filtering
        search_query = SearchQuery(
            query=chat_req.query,
            limit=chat_req.limit,
            category=category,
            tags=chat_req.tags
        )
        
        # Search for relevant documents
        matched_documents = await self.search_service.search(search_query, limit=chat_req.limit)
        
        if not matched_documents or matched_documents[0].similarity_score < 0.5:
            return ChatQueryResponse(
                answer=f"No relevant documents found in the Knowledge Crystal for {chat_req.user_role}s. Please try a different query or contact an administrator to add relevant documentation.",
                matched_documents=[],
                confidence=0.0,
                model_used=settings.OLLAMA_MODEL
            )
        
        # Prepare context from matched documents
        context = "\n\n".join([
            f"Document: {doc.title}\n"
            f"Mission ID: {doc.mission_id or 'N/A'}\n"
            f"Country: {doc.country or 'N/A'}\n"
            f"Summary: {doc.long_summary}\n"
            f"Relevant Points:\n" + "\n".join([f"- {point}" for point in doc.matched_points])
            for doc in matched_documents
        ])
        
        # Create RAG prompt for chat response
        role_context = ""
        if category == DocumentCategory.AGENT:
            role_context = """You are assisting a field agent who needs information about previous missions and operational resources. 
Focus on mission-related information, country-specific details, and operational guidance."""
        else:
            role_context = """You are assisting a technician who needs technical documentation about HQ equipment and systems.
Focus on technical specifications, setup procedures, maintenance guidelines, and troubleshooting information."""
        
        rag_prompt = f"""{role_context}

Available Information from Knowledge Crystal:
{context}

User Query: {chat_req.query}

INSTRUCTIONS:
1. Answer the User Query directly based ONLY on the Available Information.
2. DO NOT use conversational filler (e.g. "Based on the provided documents...", "I'll attempt to provide...").
3. DO NOT output internal monologues, rhetorical questions, or preamble.
4. Go straight to the point. Start your response immediately with the factual answer.
5. If the query cannot be fully answered, state exactly what is missing without apologizing.
"""
        
        try:
            # Generate answer using Ollama
            import requests
            
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": rag_prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 250,
                        "temperature": 0.1
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                answer = response.json()["response"].strip()
            else:
                answer = f"Error: Ollama API returned status {response.status_code}"
            
            # Calculate confidence based on similarity scores
            avg_confidence = sum(doc.similarity_score for doc in matched_documents) / len(matched_documents)
            
            return ChatQueryResponse(
                answer=answer,
                matched_documents=matched_documents,
                confidence=min(1.0, avg_confidence),
                model_used=settings.OLLAMA_MODEL
            )
        
        except Exception as e:
            print(f" Error generating chat response: {e}")
            return ChatQueryResponse(
                answer=f"Error generating response: {str(e)}",
                matched_documents=matched_documents,
                confidence=0.0,
                model_used=settings.OLLAMA_MODEL
            )

    async def chat_query_stream(self, chat_req: ChatQueryRequest):
        """
        Process natural language queries and stream the response as Server-Sent Events.
        """
        import json
        import httpx
        
        # Determine category based on user role
        category = None
        if chat_req.user_role:
            if chat_req.user_role.lower() == "agent":
                category = DocumentCategory.AGENT
            elif chat_req.user_role.lower() == "technician":
                category = DocumentCategory.TECHNICIAN
            elif chat_req.user_role.lower() == "admin":
                category = None
            else:
                category = DocumentCategory.AGENT
        
        search_query = SearchQuery(
            query=chat_req.query,
            limit=chat_req.limit,
            category=category,
            tags=chat_req.tags
        )
        
        matched_documents = await self.search_service.search(search_query, limit=chat_req.limit)
        
        if not matched_documents or matched_documents[0].similarity_score < 0.5:
            yield f"data: {json.dumps({'type': 'content', 'data': f'No relevant documents found in the Knowledge Crystal for {chat_req.user_role}s. Please try a different query.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return
            
        # Yield the sources immediately
        sources_data = [doc.dict() for doc in matched_documents]
        yield f"data: {json.dumps({'type': 'sources', 'data': sources_data})}\n\n"
        
        context = "\n\n".join([
            f"Document: {doc.title}\nMission ID: {doc.mission_id or 'N/A'}\nCountry: {doc.country or 'N/A'}\nSummary: {doc.long_summary}\nRelevant Points:\n" + "\n".join([f"- {point}" for point in doc.matched_points])
            for doc in matched_documents
        ])
        
        role_context = ""
        if category == DocumentCategory.AGENT:
            role_context = "You are assisting a field agent who needs information about previous missions and operational resources.\nFocus on mission-related information, country-specific details, and operational guidance."
        else:
            role_context = "You are assisting a technician who needs technical documentation about HQ equipment and systems.\nFocus on technical specifications, setup procedures, maintenance guidelines, and troubleshooting information."
        
        rag_prompt = f"""{role_context}

Available Information from Knowledge Crystal:
{context}

User Query: {chat_req.query}

INSTRUCTIONS:
1. Answer the User Query directly based ONLY on the Available Information.
2. DO NOT use conversational filler (e.g. "Based on the provided documents...", "I'll attempt to provide...").
3. DO NOT output internal monologues, rhetorical questions, or preamble.
4. Go straight to the point. Start your response immediately with the factual answer.
5. If the query cannot be fully answered, state exactly what is missing without apologizing.
"""
        
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "prompt": rag_prompt,
                        "stream": True,
                        "options": {
                            "num_predict": 300,
                            "temperature": 0.1
                        }
                    },
                    timeout=120
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                if "response" in chunk:
                                    token = chunk["response"]
                                    yield f"data: {json.dumps({'type': 'content', 'data': token})}\n\n"
                            except json.JSONDecodeError:
                                pass
                                
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            print(f"Error in chat stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"


class KBDocumentService:
    """Service for handling document uploads to Knowledge Crystal"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.page_service = KBPageService(db)
    
    async def process_uploaded_document(
        self,
        file_content: str,
        doc_upload: KBDocumentUpload,
        uploaded_by: str
    ) -> Dict[str, Any]:
        """
        Process an uploaded document and add it to Knowledge Crystal
        
        Args:
            file_content: Extracted text content from the uploaded file
            doc_upload: Document upload metadata
            uploaded_by: ID of the user who uploaded the document
        
        Returns:
            Processing result
        """
        # Create KB page from uploaded document
        page_data = KBPageCreate(
            title=doc_upload.title,
            content=file_content,
            category=doc_upload.category,
            mission_id=doc_upload.mission_id,
            country=doc_upload.country,
            tags=doc_upload.tags,
            visibility="public",  # Can be adjusted based on requirements
            author=uploaded_by,
            metadata={
                "description": doc_upload.description,
                "upload_date": datetime.utcnow().isoformat(),
                **doc_upload.metadata
            }
        )
        
        # Use the page service to create and index the document
        result = await self.page_service.create_page(page_data)
        
        return result


# Import settings at end to avoid circular imports
from app.config.settings import settings
