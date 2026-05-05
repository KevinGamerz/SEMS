import axios from 'axios';
import { useAuthStore } from './stores/authStore';

// Use environment variable for API URL, fallback to /api for local development
const apiUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiUrl,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach access token
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${apiUrl}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
