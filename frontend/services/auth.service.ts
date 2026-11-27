import { User, UserProfileRecord, UserSessionRecord } from '@/types';
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

  async getProfile(): Promise<{ user: User; profile: UserProfileRecord | null }> {
    return apiRequest<{ user: User; profile: UserProfileRecord | null }>('/auth/profile');
  },

  async updateProfile(payload: {
    fullName?: string;
    headline?: string | null;
    phone?: string | null;
    location?: string | null;
    bio?: string | null;
    experienceSummary?: string | null;
    education?: string | null;
    skills?: string[];
    portfolioUrl?: string | null;
    profileVisible?: boolean;
  }): Promise<{ user: User; profile: UserProfileRecord }> {
    return apiRequest<{ user: User; profile: UserProfileRecord }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<null> {
    return apiRequest<null>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async listSessions(): Promise<{ sessions: UserSessionRecord[] }> {
    return apiRequest<{ sessions: UserSessionRecord[] }>('/auth/sessions');
  },

  async revokeSession(id: string): Promise<null> {
    return apiRequest<null>(`/auth/sessions/${id}`, {
      method: 'DELETE',
    });
  },
};

