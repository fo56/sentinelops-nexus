const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const docSageService = {
  /**
   * Upload a document for processing
   * @param {File} file - The file to upload (PDF, image, or text)
   * @returns {Promise} - Document info with ID and processing status
   */
  uploadDocument: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/docs/upload`, {
        method: 'POST',
        body: formData,
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
   * Get document summary, keywords, and extracted text
   * @param {string} docId - Document ID
   * @returns {Promise} - Complete document details with AI summary
   */
  getDocumentSummary: async (docId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/docs/${docId}/summary`);
      
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
   * Search documents by content and keywords
   * @param {string} query - Search query
   * @returns {Promise} - List of matching documents with context
   */
  searchDocuments: async (query) => {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }
      
      const response = await fetch(
        `${API_BASE_URL}/docs/search?q=${encodeURIComponent(query)}`
      );
      
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
   * Get all documents
   * @returns {Promise} - Array of all documents with status and summaries
   */
  getAllDocuments: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/docs`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      return response.json();
    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  },

  /**
   * Delete a document
   * @param {string} docId - Document ID to delete
   * @returns {Promise} - Deletion confirmation
   */
  deleteDocument: async (docId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/docs/${docId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found');
        }
        throw new Error('Failed to delete document');
      }
      
      return response.json();
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  },

  /**
   * Poll document status (for checking if processing is complete)
   * @param {string} docId - Document ID
   * @returns {Promise} - Document status ('processing' or 'processed')
   */
  getDocumentStatus: async (docId) => {
    try {
      const doc = await docSageService.getDocumentSummary(docId);
      return doc.status;
    } catch (error) {
      console.error('Status check error:', error);
      throw error;
    }
  },

  /**
   * Wait for document to be processed
   * @param {string} docId - Document ID
   * @param {number} maxWait - Maximum wait time in milliseconds
   * @returns {Promise} - Complete document when ready
   */
  waitForProcessing: async (docId, maxWait = 60000) => {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < maxWait) {
      try {
        const doc = await docSageService.getDocumentSummary(docId);
        
        if (doc.status === 'processed') {
          return doc;
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('Error waiting for processing:', error);
        throw error;
      }
    }
    
    throw new Error('Document processing timeout');
  },
};