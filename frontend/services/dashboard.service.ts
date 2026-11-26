import {
  AdminDashboardData,
  AdminUserStats,
  CandidateDashboardData,
  RecruiterDashboardData,
  User,
  UserRole,
} from '@/types';
import { apiRequest } from './api';

export const dashboardService = {
  getCandidateDashboard(): Promise<CandidateDashboardData> {
    return apiRequest<CandidateDashboardData>('/candidate/dashboard');
  },

  getRecruiterDashboard(): Promise<RecruiterDashboardData> {
    return apiRequest<RecruiterDashboardData>('/recruiter/dashboard');
  },

  getAdminDashboard(): Promise<AdminDashboardData> {
    return apiRequest<AdminDashboardData>('/admin/dashboard');
  },

  getAdminUserStats(): Promise<AdminUserStats> {
    return apiRequest<AdminUserStats>('/admin/users/stats');
  },

  listUsers(params?: { role?: UserRole; search?: string }): Promise<{ users: User[] }> {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiRequest<{ users: User[] }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  updateUserRole(userId: string, role: UserRole): Promise<{ user: User }> {
    return apiRequest<{ user: User }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  updateUserStatus(userId: string, isActive: boolean): Promise<{ user: User }> {
    return apiRequest<{ user: User }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },
};

