const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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

      const response = await fetch(`${API_BASE_URL}/kb/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      return response.json();
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

      const response = await fetch(`${API_BASE_URL}/kb/pages?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      return response.json();
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
      const response = await fetch(`${API_BASE_URL}/kb/page/${pageId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found');
        }
        throw new Error('Failed to get document');
      }

      return response.json();
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
      const response = await fetch(`${API_BASE_URL}/kb/page/${pageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      return response.json();
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

      const response = await fetch(`${API_BASE_URL}/kb/search?${params}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
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
  chatWithAI: async (chatRequest) => {
    try {
      // Transform the request to match backend expectations
      const payload = {
        query: chatRequest.query || chatRequest.question,
        user_role: chatRequest.user_role || chatRequest.category || 'agent',
        limit: chatRequest.limit || 5,
        tags: chatRequest.tags || null,
      };

      const response = await fetch(`${API_BASE_URL}/kb/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Chat request failed');
      }

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
      const response = await fetch(`${API_BASE_URL}/kb/stats`);

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      return response.json();
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  },
};

export default knowledgeCrystalService;
