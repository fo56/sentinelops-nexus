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
        
        # Create page document
        page_doc = {
            "_id": ObjectId(),
            "title": page_data.title,
            "content": page_data.content,
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
            print(f"❌ Error fetching page: {e}")
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
    
    async def list_pages(
        self,
        visibility: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10,
        skip: int = 0
    ) -> Dict[str, Any]:
        """List knowledge pages with optional filters"""
        query = {}
        
        if visibility:
            query["visibility"] = visibility
        
        if tags:
            query["tags"] = {"$in": tags}
        
        pages = await self.collection.find(query) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        total = await self.collection.count_documents(query)
        
        # Convert ObjectId to string
        for page in pages:
            page["_id"] = str(page["_id"])
        
        return {
            "pages": pages,
            "total": total,
            "limit": limit,
            "skip": skip
        }


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
            print(f"❌ Failed to embed query: {e}")
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
            
            # Generate long summary and extract matched points
            long_summary = await self._generate_summary(page.get("content", ""))
            matched_points = await self._extract_matched_points(
                page.get("content", ""),
                query.query,
                chunk.get("content", "")
            )
            
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
    
    async def _generate_summary(self, content: str) -> str:
        """Generate a detailed summary of the document using Ollama"""
        import requests
        
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
                print(f"❌ Ollama API error: {response.status_code}")
                return content[:500]
        except Exception as e:
            print(f"❌ Error generating summary: {e}")
            return content[:500]
    
    async def _extract_matched_points(self, content: str, query: str, relevant_chunk: str) -> List[str]:
        """Extract specific points from the document that match the query using Ollama"""
        import requests
        import json
        import re
        
        try:
            prompt = f"""Based on the user query: "{query}"

Extract 3-5 specific points from this document that are most relevant to the query:

Relevant Section:
{relevant_chunk}

Full Context:
{content[:3000]}

Return the points as a JSON array of strings. Each point should be a concise statement (1-2 sentences)."""
            
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 300,
                        "temperature": 0.1
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                response_text = response.json()["response"].strip()
                
                # Try to parse JSON response
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    points = json.loads(json_match.group())
                    return points[:5]
                else:
                    # Fallback: split by lines and extract bullet points
                    lines = [line.strip().lstrip('-•*').strip() 
                            for line in response_text.split('\n') 
                            if line.strip() and not line.strip().startswith('[')]
                    return [l for l in lines if len(l) > 10][:5]
            else:
                print(f"❌ Ollama API error: {response.status_code}")
                return [relevant_chunk[:200]]
        except Exception as e:
            print(f"❌ Error extracting matched points: {e}")
            return [relevant_chunk[:200]]


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
            print(f"❌ Error generating answer: {e}")
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
        if chat_req.user_role.lower() == "agent":
            category = DocumentCategory.AGENT
        elif chat_req.user_role.lower() == "technician":
            category = DocumentCategory.TECHNICIAN
        else:
            return ChatQueryResponse(
                answer="Invalid user role. Must be 'agent' or 'technician'.",
                matched_documents=[],
                confidence=0.0,
                model_used=settings.OLLAMA_MODEL
            )
        
        # Create search query with role-based filtering
        search_query = SearchQuery(
            query=chat_req.query,
            limit=chat_req.limit,
            category=category,
            tags=chat_req.tags
        )
        
        # Search for relevant documents
        matched_documents = await self.search_service.search(search_query, limit=chat_req.limit)
        
        if not matched_documents:
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

User Query: {chat_req.query}

Available Information from Knowledge Crystal:
{context}

Please provide a comprehensive answer to the user's query based on the available documents. 
If multiple documents are relevant, synthesize the information coherently.
Always mention which documents you're referencing (by title or mission ID).

If the query cannot be fully answered with the available information, explain what is available and what might be missing."""
        
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
                        "num_predict": 600,
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
            print(f"❌ Error generating chat response: {e}")
            return ChatQueryResponse(
                answer=f"Error generating response: {str(e)}",
                matched_documents=matched_documents,
                confidence=0.0,
                model_used=settings.OLLAMA_MODEL
            )


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
