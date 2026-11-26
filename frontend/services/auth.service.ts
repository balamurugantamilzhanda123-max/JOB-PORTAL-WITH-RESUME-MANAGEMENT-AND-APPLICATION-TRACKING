import { User } from '@/types';
import { LoginFormValues, RegisterFormValues } from '@/lib/validators';
import { apiRequest } from './api';

export const authService = {
  async register(payload: RegisterFormValues): Promise<{ user: User }> {
    return apiRequest<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginFormValues): Promise<{ user: User }> {
    return apiRequest<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<void> {
    await apiRequest<null>('/auth/logout', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  },

  async refresh(): Promise<{ user: User }> {
    return apiRequest<{ user: User }>('/auth/refresh', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  },

  async getMe(): Promise<{ user: User }> {
    return apiRequest<{ user: User }>('/auth/me', {
      method: 'GET',
    });
  },
};

