// API Service Layer - Main API client
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
      ...options,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type');
      const body = contentType?.includes('application/json') 
        ? await response.json() 
        : await response.text();

      if (!response.ok) {
        let errorMessage = body.detail || body || response.statusText;
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.map(e => e.msg).join(', ');
        } else if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
        
        throw {
          status: response.status,
          message: errorMessage,
          body,
        };
      }

      return body;
    } catch (error) {
      if (error.status) throw error;
      throw {
        status: 0,
        message: error.message || 'Network error',
        body: error,
      };
    }
  }

  get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }

  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }
}

const apiClient = new APIClient();

// Auth Services
export const authService = {
  // Admin Login
  async adminLogin(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user_role', response.role);
      localStorage.setItem('user_email', response.email);
      localStorage.setItem('user_id', response.user_id);
    }
    return response;
  },

  // Ranger Login (Email + Password)
  async rangerLogin(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user_role', response.role);
      localStorage.setItem('user_email', response.email);
      localStorage.setItem('user_id', response.user_id);
    }
    return response;
  },

  // Token Login
  async tokenLogin(token) {
    const response = await apiClient.post('/auth/token-login', { token: token });
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user_role', response.role);
      localStorage.setItem('user_email', response.email);
      localStorage.setItem('user_id', response.user_id);
    }
    return response;
  },



  // Validate Current Token
  async validateToken() {
    return apiClient.get('/auth/validate');
  },

  // Get Current User
  async getCurrentUser() {
    return apiClient.get('/auth/me');
  },

  // Logout
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
  },

  // Check if authenticated
  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },

  // Get stored user info
  getUserInfo() {
    return {
      email: localStorage.getItem('user_email'),
      role: localStorage.getItem('user_role'),
      userId: localStorage.getItem('user_id'),
    };
  },
};

// Admin Services
export const adminService = {
  // Create Ranger User
  async createRangerUser(email, password, fullName, age, maritalStatus, criminalRecord, healthIssues, role = 'technician') {
    return apiClient.post('/admin/create-user', {
      email,
      password,
      full_name: fullName,
      age,
      marital_status: maritalStatus,
      criminal_record: criminalRecord,
      health_issues: healthIssues,
      role,
    });
  },

  // Get All Users
  async getAllUsers() {
    return apiClient.get('/admin/users');
  },

  // Get Specific User
  async getUser(userId) {
    return apiClient.get(`/admin/users/${userId}`);
  },

  // Get Identity Logs
  async getIdentityLogs(limit = 50, skip = 0) {
    return apiClient.get(`/admin/identity-logs?limit=${limit}&skip=${skip}`);
  },

  // Suspend User
  async suspendUser(userId) {
    return apiClient.post(`/admin/suspend-user/${userId}`);
  },

  // Activate User
  async activateUser(userId) {
    return apiClient.post(`/admin/activate-user/${userId}`);
  },
};


// Knowledge Crystal Services
export const knowledgeService = {
  // Search Documents
  async search(query, limit = 10) {
    return apiClient.post('/knowledge/search', { query, limit });
  },

  // Get Document Embeddings
  async getEmbeddings(documentId) {
    return apiClient.get(`/knowledge/embeddings/${documentId}`);
  },

  // Store Vector
  async storeVector(documentId, embedding, metadata = {}) {
    return apiClient.post('/knowledge/store', {
      document_id: documentId,
      embedding,
      metadata,
    });
  },
};

// Facility Ops Services
export const facilityOpsService = {
  // Get active issues for the logged-in technician
  async getMyIssues() {
    return apiClient.get('/facility-ops/issues');
  },

  // Get completed issues for the logged-in technician
  async getCompletedIssues() {
    return apiClient.get('/facility-ops/issues/solved');
  },

  // Submit outcome for an issue
  async submitOutcome(issueId, outcome, notes, resolutionDetails = null) {
    return apiClient.post(`/facility-ops/issues/${issueId}/outcome`, {
      outcome,
      notes,
      resolution_details: resolutionDetails
    });
  },
  
  // Get performance stats for the logged-in technician
  async getPerformanceStats() {
    return apiClient.get('/api/ops-planner/ranger-stats');
  }
};

export default apiClient;
