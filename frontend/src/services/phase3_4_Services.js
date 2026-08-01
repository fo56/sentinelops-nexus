/**
 * Phase 3 & 4 API Services
 * Handles all HTTP requests to backend endpoints
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';

// Get authorization token
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

// ==================== MFA Services ====================

export const mfaService = {
  // Setup TOTP
  setupTOTP: async () => {
    const response = await fetch(`${API_BASE}/mfa/setup/totp`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to setup TOTP');
    return response.json();
  },

  // Setup SMS
  setupSMS: async (phoneNumber) => {
    const response = await fetch(`${API_BASE}/mfa/setup/sms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
    if (!response.ok) throw new Error('Failed to setup SMS');
    return response.json();
  },

  // Setup Email
  setupEmail: async () => {
    const response = await fetch(`${API_BASE}/mfa/setup/email`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to setup Email OTP');
    return response.json();
  },

  // Verify code
  verify: async (code, method) => {
    const response = await fetch(`${API_BASE}/mfa/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, method }),
    });
    if (!response.ok) throw new Error('Invalid verification code');
    return response.json();
  },

  // Enable MFA method
  enable: async (method) => {
    const response = await fetch(`${API_BASE}/mfa/enable`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ method }),
    });
    if (!response.ok) throw new Error('Failed to enable MFA');
    return response.json();
  },

  // Disable MFA method
  disable: async (method) => {
    const response = await fetch(`${API_BASE}/mfa/disable`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ method }),
    });
    if (!response.ok) throw new Error('Failed to disable MFA');
    return response.json();
  },

  // Get MFA status
  getStatus: async () => {
    const response = await fetch(`${API_BASE}/mfa/status`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get MFA status');
    return response.json();
  },

  // Generate backup codes
  generateBackupCodes: async () => {
    const response = await fetch(`${API_BASE}/mfa/backup-codes`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to generate backup codes');
    return response.json();
  },
};

// ==================== Biometric Services ====================

export const biometricService = {
  // Enroll biometric
  enroll: async (biometricData) => {
    const response = await fetch(`${API_BASE}/biometric/enroll`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(biometricData),
    });
    if (!response.ok) throw new Error('Enrollment failed');
    return response.json();
  },

  // Verify biometric
  verify: async (biometricData, biometricType) => {
    const response = await fetch(`${API_BASE}/biometric/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...biometricData, type: biometricType }),
    });
    if (!response.ok) throw new Error('Verification failed');
    return response.json();
  },

  // Register device
  registerDevice: async (deviceName, deviceType) => {
    const response = await fetch(`${API_BASE}/biometric/device/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ device_name: deviceName, device_type: deviceType }),
    });
    if (!response.ok) throw new Error('Device registration failed');
    return response.json();
  },

  // Get devices
  getDevices: async () => {
    const response = await fetch(`${API_BASE}/biometric/devices`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch devices');
    return response.json();
  },

  // Remove device
  removeDevice: async (deviceId) => {
    const response = await fetch(`${API_BASE}/biometric/device/${deviceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove device');
    return response.json();
  },

  // Get biometric status
  getStatus: async () => {
    const response = await fetch(`${API_BASE}/biometric/status`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get biometric status');
    return response.json();
  },
};

// ==================== Analytics Services ====================

export const analyticsService = {
  // Get dashboard metrics
  getDashboard: async (dateRange = '7days') => {
    const response = await fetch(
      `${API_BASE}/analytics/dashboard?range=${dateRange}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  },

  // Get login metrics
  getLoginMetrics: async (dateRange = '7days') => {
    const response = await fetch(
      `${API_BASE}/analytics/login?range=${dateRange}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch login metrics');
    return response.json();
  },

  // Get user metrics
  getUserMetrics: async (dateRange = '7days') => {
    const response = await fetch(
      `${API_BASE}/analytics/users?range=${dateRange}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch user metrics');
    return response.json();
  },

  // Get document metrics
  getDocumentMetrics: async (dateRange = '7days') => {
    const response = await fetch(
      `${API_BASE}/analytics/documents?range=${dateRange}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch document metrics');
    return response.json();
  },

  // Get security metrics
  getSecurityMetrics: async (dateRange = '7days') => {
    const response = await fetch(
      `${API_BASE}/analytics/security?range=${dateRange}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch security metrics');
    return response.json();
  },

  // Export analytics report
  exportReport: async (format, dateRange) => {
    const response = await fetch(
      `${API_BASE}/analytics/export?format=${format}&range=${dateRange}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to export report');
    return response.blob();
  },
};

// ==================== Notification Services ====================

export const notificationService = {
  // Get all notifications
  getAll: async () => {
    const response = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await fetch(
      `${API_BASE}/notifications/${notificationId}/read`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to mark as read');
    return response.json();
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await fetch(
      `${API_BASE}/notifications/mark-all-read`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to mark all as read');
    return response.json();
  },

  // Delete notification
  delete: async (notificationId) => {
    const response = await fetch(
      `${API_BASE}/notifications/${notificationId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to delete notification');
    return response.json();
  },

  // Delete all notifications
  deleteAll: async () => {
    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete notifications');
    return response.json();
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    const response = await fetch(
      `${API_BASE}/notifications/preferences`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(preferences),
      }
    );
    if (!response.ok) throw new Error('Failed to update preferences');
    return response.json();
  },

  // Get notification preferences
  getPreferences: async () => {
    const response = await fetch(
      `${API_BASE}/notifications/preferences`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to get preferences');
    return response.json();
  },

  // Connect to WebSocket
  connectWebSocket: (userId, onMessage, onError) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found');
      return null;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const wsBase = baseUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/notifications?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log('Notification WebSocket connected');
    ws.onmessage = (event) => onMessage(JSON.parse(event.data));
    ws.onerror = (error) => onError(error);
    ws.onclose = () => console.log('Notification WebSocket disconnected');
    
    return ws;
  },
};

// ==================== Data Export Services ====================

export const dataExportService = {
  // Export data
  export: async (items, format, dateRange, customStartDate, customEndDate, includeMetadata) => {
    const payload = {
      items,
      format,
      date_range: dateRange,
      include_metadata: includeMetadata,
    };

    if (dateRange === 'custom') {
      payload.custom_start_date = customStartDate;
      payload.custom_end_date = customEndDate;
    }

    const response = await fetch(`${API_BASE}/data-export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  // Get export history
  getHistory: async () => {
    const response = await fetch(`${API_BASE}/data-export/history`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch export history');
    return response.json();
  },

  // Cancel export
  cancel: async (exportId) => {
    const response = await fetch(`${API_BASE}/data-export/${exportId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to cancel export');
    return response.json();
  },
};

// ==================== Audit Services ====================

export const auditService = {
  // Log audit event
  log: async (action, details) => {
    const response = await fetch(`${API_BASE}/audit/log`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action,
        details,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error('Failed to log audit event');
    return response.json();
  },

  // Get audit logs
  getLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE}/audit/logs?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
  },

  // Export audit logs
  exportLogs: async (format, dateRange) => {
    const response = await fetch(
      `${API_BASE}/audit/export?format=${format}&range=${dateRange}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to export audit logs');
    return response.blob();
  },
};

export default {
  mfaService,
  biometricService,
  analyticsService,
  notificationService,
  dataExportService,
  auditService,
};
