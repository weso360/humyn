const API_BASE = 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async googleLogin(userData) {
    const response = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    this.setToken(response.token);
    return response;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async humanizeText(data) {
    return this.request('/humanize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCheckoutSession() {
    return this.request('/payment/create-checkout-session', {
      method: 'POST',
    });
  }
}

export default new ApiService();