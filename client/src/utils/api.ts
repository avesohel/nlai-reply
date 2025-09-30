import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

// Create axios instance
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development'
    ? '/api'
    : process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError): Promise<AxiosError> => {
    const message = (error.response?.data as ApiError)?.message || 'Something went wrong';

    // Handle different error scenarios
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
      }
    } else if (error.response?.status === 403) {
      // Forbidden - check for subscription required
      const errorData = error.response.data as ApiError;
      if (errorData?.code === 'SUBSCRIPTION_REQUIRED') {
        window.location.href = '/subscription';
        toast.error('Active subscription required');
      } else {
        toast.error(message);
      }
    } else if (error.response?.status === 404) {
      // Not found
      toast.error('Resource not found');
    } else if (error.response?.status === 429) {
      // Rate limited
      toast.error('Too many requests. Please try again later.');
    } else if (error.response?.status && error.response.status >= 500) {
      // Server errors
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      toast.error('Request timeout. Please try again.');
    } else if (!error.response) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Other client errors
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // GET request with proper typing
  get: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    return api.get<T>(url, config);
  },

  // POST request with proper typing
  post: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return api.post<T>(url, data, config);
  },

  // PUT request with proper typing
  put: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return api.put<T>(url, data, config);
  },

  // DELETE request with proper typing
  delete: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    return api.delete<T>(url, config);
  },

  // PATCH request with proper typing
  patch: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return api.patch<T>(url, data, config);
  },
};

export default api;