'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, ShieldOff, Users } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation';
import { formatDate, formatRoleLabel } from '@/lib/utils';
import { atsService } from '@/services/ats.service';
import { dashboardService } from '@/services/dashboard.service';
import { UserRole } from '@/types';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { roleFilter, search }],
    queryFn: () =>
      dashboardService.listUsers({
        role: roleFilter ? (roleFilter as UserRole) : undefined,
        search: search || undefined,
      }),
    enabled: currentUser?.role === 'ADMIN',
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      dashboardService.updateUserStatus(id, isActive),
    onSuccess: (res) => {
      toast.success(`${res.user.fullName} is now ${res.user.isActive ? 'active' : 'deactivated'}`);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to update status'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      dashboardService.updateUserRole(id, role),
    onSuccess: (res) => {
      toast.success(`Role updated to ${res.user.role}`);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to update role'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      atsService.adminRevokeUserSessions(id, 'Admin initiated session revocation'),
    onSuccess: (res) => toast.success(`Revoked ${res.revokedCount} active session(s)`),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to revoke sessions'),
  });

  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView="users"
      pageTitle="User & Session Governance"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-600" />
                Registered Platform Users
              </CardTitle>
              <CardDescription>
                Manage account activation status, RBAC assignments, and emergency session revocation
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email..."
                  className="pl-8"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All Roles</option>
                <option value="CANDIDATE">Candidate</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-600" />
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 pr-4">User</th>
                    <th className="py-2.5 pr-4">Role</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pr-4">Created</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.users ?? []).map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id}>
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-900">{u.fullName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            disabled={isSelf || roleMutation.isPending}
                            value={u.role}
                            onChange={(e) =>
                              roleMutation.mutate({ id: u.id, role: e.target.value as UserRole })
                            }
                            aria-label={`Role for ${u.email}`}
                            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                          >
                            <option value="CANDIDATE">{formatRoleLabel('CANDIDATE')}</option>
                            <option value="RECRUITER">{formatRoleLabel('RECRUITER')}</option>
                            <option value="ADMIN">{formatRoleLabel('ADMIN')}</option>
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={u.isActive ? 'emerald' : 'red'}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={revokeMutation.isPending}
                              onClick={() => revokeMutation.mutate(u.id)}
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                              Revoke Sessions
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={u.isActive ? 'destructive' : 'outline'}
                              disabled={isSelf || statusMutation.isPending}
                              onClick={() =>
                                statusMutation.mutate({ id: u.id, isActive: !u.isActive })
                              }
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
