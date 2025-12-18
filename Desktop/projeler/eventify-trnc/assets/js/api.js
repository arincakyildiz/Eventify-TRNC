// Eventify TRNC - API Service
// Handles all communication with the backend

const API_BASE_URL = 'http://localhost:5000/api';

// Token management
let authToken = localStorage.getItem('eventify_token');

function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('eventify_token', token);
  } else {
    localStorage.removeItem('eventify_token');
  }
}

function getToken() {
  return authToken;
}

function clearToken() {
  authToken = null;
  localStorage.removeItem('eventify_token');
}

// Generic fetch wrapper with auth header
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// File upload (for images)
async function uploadFile(endpoint, file, fieldName = 'image') {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
}

// ==================== AUTH API ====================

const AuthAPI = {
  // Register new user (step 1)
  async register(userData) {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Verify email with code (step 2)
  async verifyEmail(email, code) {
    const response = await fetchAPI('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  },

  // Resend verification code
  async resendCode(email) {
    return fetchAPI('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Login
  async login(email, password) {
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  },

  // Get current user
  async getMe() {
    return fetchAPI('/auth/me');
  },

  // Logout (client-side only)
  logout() {
    clearToken();
  },

  // Check if logged in
  isLoggedIn() {
    return !!authToken;
  }
};

// ==================== ADMIN API ====================

let adminToken = localStorage.getItem('eventify_admin_token');

function setAdminToken(token) {
  adminToken = token;
  if (token) {
    localStorage.setItem('eventify_admin_token', token);
  } else {
    localStorage.removeItem('eventify_admin_token');
  }
}

function getAdminToken() {
  return adminToken;
}

async function fetchAdminAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('Admin API Error:', error);
    throw error;
  }
}

const AdminAPI = {
  // Admin login
  async login(email, password) {
    const response = await fetchAdminAPI('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      setAdminToken(response.token);
    }
    
    return response;
  },

  // Get admin info
  async getMe() {
    return fetchAdminAPI('/admin/me');
  },

  // Logout
  logout() {
    adminToken = null;
    localStorage.removeItem('eventify_admin_token');
  },

  // Check if admin logged in
  isLoggedIn() {
    return !!adminToken;
  },

  // Get event registrations
  async getEventRegistrations(eventId) {
    return fetchAdminAPI(`/admin/events/${eventId}/registrations`);
  },

  // Upload event image
  async uploadEventImage(file) {
    const url = `${API_BASE_URL}/upload/event-image`;
    
    const formData = new FormData();
    formData.append('image', file);

    const headers = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  }
};

// ==================== EVENTS API ====================

const EventsAPI = {
  // Get all events with optional filters
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.city) params.append('city', filters.city);
    if (filters.category) params.append('category', filters.category);
    if (filters.date) params.append('date', filters.date);
    if (filters.search) params.append('search', filters.search);
    if (filters.upcoming) params.append('upcoming', 'true');
    
    const queryString = params.toString();
    const endpoint = queryString ? `/events?${queryString}` : '/events';
    
    return fetchAPI(endpoint);
  },

  // Get single event
  async getById(eventId) {
    return fetchAPI(`/events/${eventId}`);
  },

  // Create event (Admin)
  async create(eventData) {
    return fetchAdminAPI('/events', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  },

  // Update event (Admin)
  async update(eventId, eventData) {
    return fetchAdminAPI(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData)
    });
  },

  // Delete event (Admin)
  async delete(eventId) {
    return fetchAdminAPI(`/events/${eventId}`, {
      method: 'DELETE'
    });
  }
};

// ==================== REGISTRATIONS API ====================

const RegistrationsAPI = {
  // Get user's registrations
  async getMyRegistrations() {
    return fetchAPI('/registrations');
  },

  // Get single registration
  async getById(registrationId) {
    return fetchAPI(`/registrations/${registrationId}`);
  },

  // Register for event
  async register(eventId, participants) {
    return fetchAPI('/registrations', {
      method: 'POST',
      body: JSON.stringify({ eventId, participants })
    });
  },

  // Cancel registration
  async cancel(registrationId) {
    return fetchAPI(`/registrations/${registrationId}/cancel`, {
      method: 'PUT'
    });
  }
};

// ==================== HEALTH CHECK ====================

async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data.status === 'OK';
  } catch (error) {
    console.error('API Health Check Failed:', error);
    return false;
  }
}

// Export all APIs
window.EventifyAPI = {
  Auth: AuthAPI,
  Admin: AdminAPI,
  Events: EventsAPI,
  Registrations: RegistrationsAPI,
  checkHealth: checkAPIHealth,
  getImageUrl: (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http') || imagePath.startsWith('/uploads')) {
      return imagePath.startsWith('/uploads') ? `http://localhost:5000${imagePath}` : imagePath;
    }
    // Legacy images from assets folder
    return `assets/images/${imagePath}`;
  }
};

// Check API connection on load
checkAPIHealth().then(isHealthy => {
  if (isHealthy) {
    console.log('✅ Connected to Eventify API');
  } else {
    console.warn('⚠️ API is not available. Some features may not work.');
  }
});

