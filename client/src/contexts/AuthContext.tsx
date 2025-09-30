import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';

// Define User interface to match backend
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  youtubeChannels?: Array<{
    channelId: string;
    channelName: string;
    connected: boolean;
    lastSync?: string;
  }>;
  subscription?: {
    id: string;
    plan: 'basic' | 'pro' | 'enterprise';
    status: string;
  };
  settings?: {
    emailNotifications: boolean;
    replyDelay: number;
    maxRepliesPerHour: number;
  };
  usage?: {
    repliesSent: number;
    currentPeriodStart?: string;
    currentPeriodReplies: number;
  };
}

// Auth response interfaces
interface AuthResponse {
  success: boolean;
  message?: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

// Register data interface
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (): Promise<void> => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      const { token, user: userData } = response.data;

      if (token && userData) {
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/register', userData);
      const { token, user: newUser } = response.data;

      if (token && newUser) {
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(newUser);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (userData: Partial<User>): void => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const refreshUser = async (): Promise<void> => {
    await fetchUser();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};