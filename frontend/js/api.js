/**
 * ============================================================================
 * PAKIV EMPLOYEE VERIFICATION PORTAL - CLIENT API MODULE
 * Pure Vanilla JavaScript (ES6+), Fetch API, Standardized Responses
 * ============================================================================
 */

const API_BASE = window.PAKIV_API_URL || '/api/v1';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.authToken = localStorage.getItem('pakiv_admin_token') || null;
  }

  setToken(token) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('pakiv_admin_token', token);
    } else {
      localStorage.removeItem('pakiv_admin_token');
    }
  }

  getToken() {
    return this.authToken;
  }

  clearToken() {
    this.authToken = null;
    localStorage.removeItem('pakiv_admin_token');
  }

  /**
   * Internal fetch wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include', // Transport HttpOnly cookies
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({
        success: false,
        message: `HTTP Error: ${response.status} ${response.statusText}`,
      }));

      if (!response.ok) {
        // If 401 Unauthorized and currently on an admin page, redirect to login
        if (response.status === 401 && window.location.pathname.includes('/admin/')) {
          if (!window.location.pathname.includes('login.html')) {
            this.clearToken();
            window.location.href = '/admin/login.html?expired=1';
          }
        }

        const err = new Error(data.message || 'Request failed');
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // ----------------- Public Endpoints -----------------

  async searchEmployees(query = '', page = 1, limit = 10) {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(limit),
    });
    return this.request(`/employees/search?${params.toString()}`, { method: 'GET' });
  }

  async verifyEmployee(employeeId) {
    const cleanId = encodeURIComponent(employeeId.trim().toUpperCase());
    return this.request(`/employees/${cleanId}/verify`, { method: 'GET' });
  }

  // ----------------- Authentication Endpoints -----------------

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.data?.accessToken) {
      this.setToken(data.data.accessToken);
    }
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      this.clearToken();
      window.location.href = '/admin/login.html';
    }
  }

  async getMe() {
    return this.request('/auth/me', { method: 'GET' });
  }

  async updateProfile(profileData) {
    return this.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  // ----------------- Admin Employee Management -----------------

  async getStats() {
    return this.request('/admin/employees/stats', { method: 'GET' });
  }

  async getNextEmployeeId() {
    return this.request('/admin/employees/generate-id', { method: 'GET' });
  }

  async getEmployees(params = {}) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.status) query.append('status', params.status);
    if (params.department) query.append('department', params.department);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    return this.request(`/admin/employees?${query.toString()}`, { method: 'GET' });
  }

  async getEmployee(id) {
    return this.request(`/admin/employees/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  async createEmployee(payload) {
    return this.request('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateEmployee(id, payload) {
    return this.request(`/admin/employees/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async revokeEmployee(id, reason) {
    return this.request(`/admin/employees/${encodeURIComponent(id)}/revoke`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async restoreEmployee(id) {
    return this.request(`/admin/employees/${encodeURIComponent(id)}/restore`, {
      method: 'PATCH',
    });
  }

  async deleteEmployee(id, permanent = false) {
    const url = `/admin/employees/${encodeURIComponent(id)}${permanent ? '?permanent=true' : ''}`;
    return this.request(url, { method: 'DELETE' });
  }

  // ----------------- Cloudflare R2 / Asset Upload -----------------

  async uploadPhoto(file, employeeId = 'general') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('employeeId', employeeId);

    return this.request('/admin/uploads/profile-image', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteUploadedPhoto(objectKey) {
    return this.request(`/admin/uploads/${encodeURIComponent(objectKey)}`, {
      method: 'DELETE',
    });
  }

  // ----------------- Audit Logs -----------------

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.action) query.append('action', params.action);
    return this.request(`/admin/audit-logs?${query.toString()}`, { method: 'GET' });
  }
}

// Global API instance
window.api = new ApiClient(API_BASE);

// ----------------- UI Helpers & Formatters -----------------

window.PakivUI = {
  showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  formatDate(dateInput) {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  getStatusBadgeClass(status) {
    switch (status) {
      case 'Currently Employed':
        return 'status-employed';
      case 'Contract Completed':
        return 'status-completed';
      case 'Resigned':
      case 'Contract Ended':
        return 'status-resigned';
      case 'Record Revoked':
        return 'status-revoked';
      default:
        return 'status-employed';
    }
  },

  debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },
};

