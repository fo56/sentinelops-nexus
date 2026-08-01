import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://sentinel-ops1.onrender.com';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sentinel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const issueService = {
  // Fetch all issues
  async getIssues() {
    try {
      const response = await api.get('/facility-ops/issues');
      return response.data;
    } catch (error) {
      console.warn('Error fetching issues from API:', error.message);
      // Return empty array as fallback
      return [];
    }
  },

  // Create new issue
  async createIssue(issueData) {
    try {
      const response = await api.post('/facility-ops/issues', issueData);
      return response.data;
    } catch (error) {
      console.error('Error creating issue:', error);
      throw error;
    }
  },

  // Assign issue to user and move to in-progress
  async assignIssue(issueId, userId) {
    try {
      const response = await api.patch(`/facility-ops/issues/${issueId}/assign`, {
        assigneeId: userId,
        status: 'in-progress',
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning issue:', error);
      throw error;
    }
  },

  // Update issue status
  async updateIssueStatus(issueId, status) {
    try {
      const response = await api.patch(`/facility-ops/issues/${issueId}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating issue status:', error);
      throw error;
    }
  },

  // Get issue logs
  async getIssueLogs(issueId) {
    try {
      const response = await api.get(`/facility-ops/issues/${issueId}/logs`);
      return response.data;
    } catch (error) {
      console.error('Error fetching issue logs:', error);
      throw error;
    }
  },
};

export default api;
