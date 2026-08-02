"""
Vector Store Management using ChromaDB
Handles initialization, chunk storage, and similarity search
"""
import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime


class VectorStoreManager:
    """Manages ChromaDB vector store for embeddings"""
    
    def __init__(self, persist_directory: str = "./vector_db"):
        """
        Initialize ChromaDB vector store
        
        Args:
            persist_directory: Path to persist vector data
        """
        self.persist_directory = persist_directory
        
        # Create persist directory if it doesn't exist
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize ChromaDB with persistence
        self.client = chromadb.PersistentClient(path=persist_directory)
        
        # Get or create collection for KB pages
        self.collection = self.client.get_or_create_collection(
            name="kb_pages",
            metadata={"hnsw:space": "cosine"}
        )
        
        print(f" Vector Store initialized at {persist_directory}")
    
    def add_chunks(
        self,
        page_id: str,
        chunks: List[str],
        title: str,
        embeddings: List[List[float]],
        metadata: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Add chunks with embeddings to vector store
        
        Args:
            page_id: ID of the knowledge page
            chunks: List of text chunks
            title: Title of the page
            embeddings: List of embedding vectors
            metadata: Optional metadata for each chunk
        
        Returns:
            Dictionary with storage results
        """
        if not chunks or not embeddings:
            return {"success": False, "error": "Empty chunks or embeddings"}
        
        if len(chunks) != len(embeddings):
            return {"success": False, "error": "Chunks and embeddings count mismatch"}
        
        try:
            # Create unique IDs for each chunk
            chunk_ids = [f"{page_id}_chunk_{i}" for i in range(len(chunks))]
            
            # Prepare metadata for each chunk
            if metadata is None:
                metadata = []
            
            # Ensure metadata length matches chunks
            while len(metadata) < len(chunks):
                metadata.append({})
            
            # Add page title and ID to each chunk's metadata
            for i, meta in enumerate(metadata):
                meta["page_id"] = page_id
                meta["chunk_index"] = i
                meta["title"] = title
                meta["created_at"] = datetime.utcnow().isoformat()
            
            # Add to ChromaDB collection
            self.collection.add(
                ids=chunk_ids,
                embeddings=embeddings,
                metadatas=metadata,
                documents=chunks
            )
            
            return {
                "success": True,
                "chunks_added": len(chunks),
                "page_id": page_id,
                "chunk_ids": chunk_ids
            }
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def search(
        self,
        query_embedding: List[float],
        limit: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using embedding
        
        Args:
            query_embedding: Query embedding vector
            limit: Number of results to return
            filters: Optional filters (e.g., {"category": "agent"})
        
        Returns:
            List of search results with documents and scores
        """
        try:
            # Debug: print filters being applied
            print(f" Vector Store Search - Applying filters: {filters}")
            
            # Query ChromaDB with filters
            query_params = {
                "query_embeddings": [query_embedding],
                "n_results": limit
            }
            
            # Only add where clause if filters are provided
            if filters:
                query_params["where"] = filters
            
            results = self.collection.query(**query_params)
            
            # Format results
            formatted_results = []
            if results and results.get("documents"):
                documents = results["documents"][0]
                distances = results["distances"][0] if results.get("distances") else []
                metadatas = results["metadatas"][0] if results.get("metadatas") else []
                ids = results["ids"][0] if results.get("ids") else []
                
                print(f" Found {len(documents)} results from ChromaDB")
                
                for i, doc in enumerate(documents):
                    # Convert distance to similarity score (cosine distance to similarity)
                    similarity = 1 - (distances[i] if i < len(distances) else 0)
                    
                    # Debug: show category of each result
                    metadata = metadatas[i] if i < len(metadatas) else {}
                    print(f"   Result {i+1}: category='{metadata.get('category', 'NONE')}', similarity={similarity:.3f}")
                    
                    formatted_results.append({
                        "chunk_id": ids[i] if i < len(ids) else "",
                        "content": doc,
                        "similarity_score": max(0, min(1, similarity)),
                        "metadata": metadata
                    })
            
            return formatted_results
        
        except Exception as e:
            print(f" Search error: {e}")
            return []
    
    def delete_chunks(self, page_id: str) -> Dict[str, Any]:
        """
        Delete all chunks for a page
        
        Args:
            page_id: ID of the page to delete
        
        Returns:
            Deletion result
        """
        try:
            # Get all chunk IDs for this page
            results = self.collection.get(
                where={"page_id": page_id}
            )
            
            if results and results.get("ids"):
                self.collection.delete(ids=results["ids"])
                return {
                    "success": True,
                    "deleted_chunks": len(results["ids"])
                }
            
            return {"success": True, "deleted_chunks": 0}
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    

# Global vector store instance
vector_store: Optional[VectorStoreManager] = None


def get_vector_store() -> VectorStoreManager:
    """Get or create global vector store instance"""
    global vector_store
    if vector_store is None:
        vector_store = VectorStoreManager()
    return vector_store


def init_vector_store(persist_directory: str = "./vector_db") -> VectorStoreManager:
    """Initialize global vector store"""
    global vector_store
    vector_store = VectorStoreManager(persist_directory)
    return vector_store
