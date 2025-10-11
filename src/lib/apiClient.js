// API client helper for dev vs prod environments
const getBaseUrl = () => {
  if (window.location.origin.includes('localhost:5173') || window.location.origin.includes('localhost:5174')) {
    return ''; // Use relative URLs for Vite proxy
  }
  return '';
};

// Get fresh access token from Supabase
const getAccessToken = async () => {
  try {
    const { data: { session } } = await import('../lib/supabaseClient').then(m => m.supabase.auth.getSession());
    return session?.access_token;
  } catch (error) {
    console.error('[API] Error getting access token:', error);
    return null;
  }
};

// Helper function to create a timeout promise
const createTimeoutPromise = (timeoutMs = 5000) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
};

export const apiClient = {
  async get(endpoint, options = {}) {
    const url = getBaseUrl() + endpoint;
    console.log('[API] GET:', url);

    try {
      // Get fresh access token
      const token = await getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchPromise = fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
        ...options,
      });

      // Add timeout to the fetch request
      const timeoutPromise = createTimeoutPromise(3000); // 3 second timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        // Handle 401 specifically
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({ error: 'auth_required' }));
          if (errorData.error === 'auth_required') {
            throw new Error('auth_required');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API] GET error:', error);
      // Add network error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('network_error');
      }
      if (error.message === 'Request timeout') {
        throw new Error('timeout_error');
      }
      throw error;
    }
  },

  async post(endpoint, data, options = {}) {
    const url = getBaseUrl() + endpoint;
    console.log('[API] 📤 POST:', url);
    console.log('[API] 📦 Request data:', JSON.stringify(data, null, 2));

    try {
      // Get fresh access token
      const token = await getAccessToken();
      console.log('[API] 🔑 Token:', token ? `${token.substring(0, 20)}...` : 'None');
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchPromise = fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(data),
        ...options,
      });

      // Add timeout to the fetch request
      const timeoutPromise = createTimeoutPromise(5000); // 5 second timeout for POST
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      console.log('[API] 📥 Response status:', response.status);

      if (!response.ok) {
        // Handle 401 specifically
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({ error: 'auth_required' }));
          console.error('[API] ❌ 401 Error:', errorData);
          if (errorData.error === 'auth_required') {
            throw new Error('auth_required');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('[API] ❌ Error response:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[API] ✅ Success response:', result);
      return result;
    } catch (error) {
      console.error('[API] ❌ POST error:', error);
      console.error('[API] ❌ Error stack:', error.stack);
      // Add network error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('network_error');
      }
      if (error.message === 'Request timeout') {
        throw new Error('timeout_error');
      }
      throw error;
    }
  },

  async put(endpoint, data, options = {}) {
    const url = getBaseUrl() + endpoint;
    console.log('[API] PUT:', url, data);

    try {
      // Get fresh access token
      const token = await getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchPromise = fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(data),
        ...options,
      });

      // Add timeout to the fetch request
      const timeoutPromise = createTimeoutPromise(5000); // 5 second timeout for PUT
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        // Handle 401 specifically
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({ error: 'auth_required' }));
          if (errorData.error === 'auth_required') {
            throw new Error('auth_required');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API] PUT error:', error);
      // Add network error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('network_error');
      }
      if (error.message === 'Request timeout') {
        throw new Error('timeout_error');
      }
      throw error;
    }
  }
};
