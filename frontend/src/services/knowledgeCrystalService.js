const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
import apiClient from './api';

export const knowledgeCrystalService = {
  /**
   * Upload a document to Knowledge Crystal
   * @param {Object} data - Document data with file content
   * @returns {Promise} - Upload result
   */
  uploadDocument: async (data) => {
    try {
      // Use the /create endpoint which expects KBPageCreate format
      const payload = {
        title: data.title || data.doc_upload?.title,
        content: data.file_content,
        category: data.category || data.doc_upload?.category,
        mission_id: data.mission_id || data.doc_upload?.mission_id || null,
        country: data.country || data.doc_upload?.country || null,
        tags: data.tags || data.doc_upload?.tags || [],
        visibility: 'public',
        author: data.uploaded_by || 'admin',
        metadata: data.metadata || data.doc_upload?.metadata || {},
      };

      return await apiClient.post('/kb/create', payload);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  /**
   * Get all documents with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise} - List of documents
   */
  getDocuments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.country) params.append('country', filters.country);
      if (filters.mission_id) params.append('mission_id', filters.mission_id);
      if (filters.visibility) params.append('visibility', filters.visibility);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.skip) params.append('skip', filters.skip);
      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }

      return await apiClient.get(`/kb/pages?${params}`);
    } catch (error) {
      console.error('Fetch documents error:', error);
      throw error;
    }
  },

  /**
   * Get a single document by ID
   * @param {string} pageId - Document ID
   * @returns {Promise} - Document details
   */
  getDocument: async (pageId) => {
    try {
      return await apiClient.get(`/kb/page/${pageId}`);
    } catch (error) {
      console.error('Get document error:', error);
      throw error;
    }
  },

  /**
   * Delete a document
   * @param {string} pageId - Document ID
   * @returns {Promise} - Delete result
   */
  deleteDocument: async (pageId) => {
    try {
      return await apiClient.delete(`/kb/page/${pageId}`);
    } catch (error) {
      console.error('Delete document error:', error);
      throw error;
    }
  },

  /**
   * Search documents
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise} - Search results
   */
  searchDocuments: async (query, filters = {}) => {
    try {
      const params = new URLSearchParams({ q: query });
      
      if (filters.category) params.append('category', filters.category);
      if (filters.country) params.append('country', filters.country);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }

      return await apiClient.get(`/kb/search?${params}`);
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  /**
   * Chat with AI about documents
   * @param {Object} chatRequest - Chat request data with query, user_role, limit
   * @returns {Promise} - AI response
   */
  chatWithAI: async (chatRequest, onChunk) => {
    try {
      const payload = {
        query: chatRequest.query || chatRequest.question,
        user_role: chatRequest.user_role || chatRequest.category || 'agent',
        limit: chatRequest.limit || 5,
        tags: chatRequest.tags || null,
      };

      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/kb/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Chat request failed');
      }

      if (onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last partial line in the buffer
          buffer = lines.pop();
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr.trim() === '') continue;
              
              try {
                const parsed = JSON.parse(dataStr);
                onChunk(parsed);
              } catch (e) {
                console.warn('Failed to parse SSE data:', dataStr, e);
              }
            }
          }
        }
        return { success: true };
      }
      
      // Fallback if onChunk is not provided (legacy)
      return response.json();
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  },

  /**
   * Download document content
   * @param {string} pageId - Document ID
   * @returns {Promise} - Document content for download
   */
  downloadDocument: async (pageId) => {
    try {
      const result = await knowledgeCrystalService.getDocument(pageId);
      
      if (!result.data) {
        throw new Error('Document data not found');
      }

      const doc = result.data;
      const content = `Title: ${doc.title}\n\nCategory: ${doc.category}\n\nContent:\n${doc.content}`;
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  },

  /**
   * Get Knowledge Crystal stats
   * @returns {Promise} - KB statistics
   */
  getStats: async () => {
    try {
      return await apiClient.get('/kb/stats');
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  },
};

export default knowledgeCrystalService;
