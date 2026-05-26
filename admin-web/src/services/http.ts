import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const http = axios.create({
  baseURL: '/api/admin/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add auth token + tenant header
http.interceptors.request.use((config) => {
  const { accessToken, tenantId } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }

  return config;
});

// Response interceptor: handle 401 auto-refresh
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/admin/v1/auth/refresh', {
            refresh_token: refreshToken,
          });

          if (data.code === 0) {
            setTokens(data.data.access_token, data.data.refresh_token);
            originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
            return http(originalRequest);
          }
        } catch {
          // Refresh failed, logout
        }
      }

      logout();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default http;
