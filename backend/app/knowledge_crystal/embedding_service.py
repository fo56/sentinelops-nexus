"""
Embedding Service using Ollama
Handles text chunking and vector generation
"""
import re
from typing import List, Dict, Any, Tuple
import requests
from app.config.settings import settings


class EmbeddingService:
    """Service for creating embeddings using Ollama"""
    
    def __init__(self, model: str = None):
        """
        Initialize embedding service
        
        Args:
            model: Ollama embedding model to use (default: nomic-embed-text from settings)
        """
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = model or getattr(settings, 'OLLAMA_EMBEDDING_MODEL', settings.OLLAMA_MODEL)
        
        # Test Ollama connection
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                print(f" Embedding Service initialized with Ollama ({self.model})")
            else:
                raise ConnectionError("Cannot connect to Ollama")
        except Exception as e:
            print(f" Ollama not running. Start it with: ollama serve")
            raise ConnectionError(f"Ollama connection failed: {e}")
    
    def chunk_text(
        self,
        text: str,
        chunk_size: int = 250,
        overlap: int = 50
    ) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            chunk_size: Target size of each chunk (words)
            overlap: Number of words to overlap between chunks
        
        Returns:
            List of text chunks
        """
        if not text or len(text.strip()) == 0:
            return []
        
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            sentence_words = sentence.split()
            sentence_len = len(sentence_words)
            
            if current_length + sentence_len > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                # Take overlap words from the end of the chunk
                overlap_words = current_chunk[-overlap:] if overlap > 0 else []
                current_chunk = overlap_words + sentence_words
                current_length = len(current_chunk)
            else:
                current_chunk.extend(sentence_words)
                current_length += sentence_len
                
        if current_chunk:
            chunks.append(" ".join(current_chunk))
            
        return chunks
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using Ollama
        
        Args:
            texts: List of text strings to embed
        
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            # Filter out empty texts
            valid_texts = [t.strip() for t in texts if t.strip()]
            
            if not valid_texts:
                return []
            
            # Generate embeddings using Ollama API
            embeddings = []
            for text in valid_texts:
                response = requests.post(
                    f"{self.base_url}/api/embeddings",
                    json={
                        "model": self.model,
                        "prompt": text
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    embedding = response.json()["embedding"]
                    embeddings.append(embedding)
                else:
                    print(f" Ollama embedding error: {response.status_code}")
                    raise Exception(f"Ollama API returned status {response.status_code}")
            
            return embeddings
        
        except Exception as e:
            print(f" Error generating embeddings: {e}")
            raise
    
    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a single query using Ollama
        
        Args:
            query: Query text to embed
        
        Returns:
            Embedding vector
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        try:
            # Add prefix for nomic-embed-text
            prompt_text = query.strip()
            if "nomic" in self.model:
                prompt_text = f"search_query: {prompt_text}"
                
            response = requests.post(
                f"{self.base_url}/api/embeddings",
                json={
                    "model": self.model,
                    "prompt": prompt_text
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()["embedding"]
            else:
                print(f" Ollama embedding error: {response.status_code}")
                raise Exception(f"Ollama API returned status {response.status_code}")
        
        except Exception as e:
            print(f" Error embedding query: {e}")
            raise
    
    def process_content(
        self,
        content: str,
        chunk_size: int = 250,
        overlap: int = 50,
        context_header: str = ""
    ) -> Tuple[List[str], List[List[float]]]:
        """
        Process content: chunk and embed
        
        Args:
            content: Raw content to process
            chunk_size: Target chunk size in words
            overlap: Overlap between chunks in words
        
        Returns:
            Tuple of (chunks, embeddings)
        """
        # Chunk the text
        chunks = self.chunk_text(content, chunk_size, overlap)
        
        # Prepend context header to EVERY chunk individually
        if context_header:
            chunks = [f"{context_header}{chunk}" for chunk in chunks]
        
        if not chunks:
            raise ValueError("No chunks generated from content")
        
        # Generate embeddings
        embeddings = self.generate_embeddings(chunks)
        
        if len(embeddings) != len(chunks):
            raise ValueError("Mismatch between chunks and embeddings")
        
        return chunks, embeddings


# Global embedding service instance
_embedding_service = None


def get_embedding_service() -> EmbeddingService:
    """Get or create global embedding service instance"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def init_embedding_service(model: str = None) -> EmbeddingService:
    """Initialize global embedding service"""
    global _embedding_service
    _embedding_service = EmbeddingService(model)
    return _embedding_service
