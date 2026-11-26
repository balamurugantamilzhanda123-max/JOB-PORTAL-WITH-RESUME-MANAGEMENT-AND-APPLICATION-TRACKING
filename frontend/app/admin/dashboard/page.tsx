'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  Building,
  CheckCircle2,
  Database,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AccountProfilePanel } from '@/components/dashboard/AccountProfilePanel';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { SidebarNavItem } from '@/components/navigation/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatRoleLabel } from '@/lib/utils';
import { ApiClientError } from '@/services/api';
import { atsService } from '@/services/ats.service';
import { dashboardService } from '@/services/dashboard.service';
import {
  AdminDashboardData,
  AuditLogRecord,
  CompanyProfile,
  CompanyVerificationStatus,
  FunnelAnalytics,
  User,
  UserRole,
} from '@/types';

const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'verification', label: 'Company Verification', icon: Building },
  { id: 'roles', label: 'Role Management', icon: KeyRound },
  { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
  { id: 'audit', label: 'Audit Logs', icon: FileSearch },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const VIEW_TITLES: Record<string, string> = {
  overview: 'Admin Overview',
  users: 'User Management',
  verification: 'Company Verification Queue',
  roles: 'Role Management',
  analytics: 'Platform Hiring Analytics',
  audit: 'System Audit Logs',
  profile: 'Administrator Profile',
  settings: 'Platform Settings',
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [analytics, setAnalytics] = useState<FunnelAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [verifyReasonById, setVerifyReasonById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, compRes, funnelRes, logsRes] = await Promise.all([
        dashboardService.getAdminDashboard(),
        atsService.adminListCompanies(),
        atsService.getFunnelAnalytics(),
        atsService.adminListAuditLogs(),
      ]);
      setData(dashRes);
      setCompanies(compRes.companies);
      setAnalytics(funnelRes);
      setAuditLogs(logsRes.logs);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Unable to load admin dashboard metrics.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (roleVal: string, searchVal: string) => {
    setUsersLoading(true);
    try {
      const response = await dashboardService.listUsers({
        role: roleVal !== 'ALL' ? (roleVal as UserRole) : undefined,
        search: searchVal || undefined,
      });
      setUsers(response.users);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to load user directory');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void loadDashboard();
      void loadUsers('ALL', '');
    }
  }, [user?.role, loadDashboard, loadUsers]);

  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    setUpdatingUserId(targetUser.id);
    try {
      const res = await dashboardService.updateUserRole(targetUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? res.user : u)));
      toast.success(`Updated ${targetUser.fullName}'s role to ${newRole}`);
      void loadDashboard();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStatusToggle = async (targetUser: User) => {
    setUpdatingUserId(targetUser.id);
    try {
      const res = await dashboardService.updateUserStatus(targetUser.id, !targetUser.isActive);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? res.user : u)));
      toast.success(
        `${targetUser.fullName} is now ${res.user.isActive ? 'active' : 'deactivated'}`,
      );
      void loadDashboard();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update status');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleVerifyCompany = async (
    companyId: string,
    status: CompanyVerificationStatus,
  ) => {
    const reason =
      verifyReasonById[companyId]?.trim() || `Administrator marked company ${status}`;
    try {
      const res = await atsService.adminVerifyCompany(companyId, { status, reason });
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? res.company : c)));
      toast.success(`Company status updated to ${status}`);
      void loadDashboard();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Verification update failed');
    }
  };

  const activeUser = data?.user || user;

  const renderUserDirectory = (mode: 'users' | 'roles') => (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle>
              {mode === 'roles' ? 'RBAC Role Assignment' : 'Registered Platform Users'}
            </CardTitle>
            <CardDescription>
              Live PostgreSQL user records. Role changes apply immediately on the user&apos;s next API request.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadUsers(roleFilter, searchQuery)}
            disabled={usersLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                void loadUsers(roleFilter, e.target.value);
              }}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'CANDIDATE', 'RECRUITER', 'ADMIN'] as const).map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={roleFilter === r ? 'default' : 'outline'}
                onClick={() => {
                  setRoleFilter(r);
                  void loadUsers(r, searchQuery);
                }}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {usersLoading ? 'Loading users from PostgreSQL...' : 'No matching users found.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-3 pr-4 font-semibold">User</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Joined</th>
                  <th className="py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === activeUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-slate-900">
                          {u.fullName}{' '}
                          {isSelf && (
                            <Badge variant="violet" className="ml-1">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge
                          variant={
                            u.role === 'ADMIN'
                              ? 'violet'
                              : u.role === 'RECRUITER'
                                ? 'teal'
                                : 'blue'
                          }
                        >
                          {formatRoleLabel(u.role)}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge variant={u.isActive ? 'emerald' : 'red'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <select
                            aria-label={`Change role for ${u.fullName}`}
                            value={u.role}
                            disabled={isSelf || updatingUserId === u.id}
                            onChange={(e) => void handleRoleChange(u, e.target.value as UserRole)}
                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="CANDIDATE">CANDIDATE</option>
                            <option value="RECRUITER">RECRUITER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant={u.isActive ? 'outline' : 'secondary'}
                            disabled={isSelf || updatingUserId === u.id}
                            onClick={() => void handleStatusToggle(u)}
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
  );

  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView={activeView}
      onSelectView={setActiveView}
      pageTitle={VIEW_TITLES[activeView] || 'Admin Dashboard'}
    >
      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadDashboard()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : activeUser ? (
        <>
          {activeView === 'overview' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-violet-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <Badge className="border-violet-400/30 bg-violet-500/20 text-violet-200">
                      Platform Administration Console
                    </Badge>
                    <h2 className="mt-2.5 text-2xl font-semibold tracking-tight">
                      Welcome, {activeUser.fullName}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-300">
                      Real-time PostgreSQL user metrics, company verification queue, platform hiring funnel analytics, and immutable audit logs.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadDashboard()}
                    className="shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh Metrics
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Registered Users"
                  value={data?.stats.totalUsers ?? 0}
                  subtext={`${data?.stats.activeUsersCount ?? 0} active • ${data?.stats.adminCount ?? 0} admin(s)`}
                  icon={Users}
                  accentClass="bg-violet-50 text-violet-600"
                />
                <StatCard
                  label="Candidate Accounts"
                  value={data?.stats.candidateCount ?? 0}
                  subtext="Verified PostgreSQL records"
                  icon={UserCheck}
                  accentClass="bg-blue-50 text-blue-600"
                />
                <StatCard
                  label="Recruiter Accounts"
                  value={data?.stats.recruiterCount ?? 0}
                  subtext={`${companies.length} company profile(s)`}
                  icon={Briefcase}
                  accentClass="bg-teal-50 text-teal-600"
                />
                <StatCard
                  label="Active Auth Sessions"
                  value={data?.stats.activeSessionsCount ?? 0}
                  subtext="Valid non-revoked refresh tokens"
                  icon={ShieldAlert}
                  accentClass="bg-amber-50 text-amber-600"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-emerald-600" />
                      PostgreSQL Connection Status
                    </CardTitle>
                    <CardDescription>Live health probe via Prisma ORM</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs text-slate-500">Database Status</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            data?.system.database === 'Connected'
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <span className="text-sm font-semibold text-slate-900">
                          {data?.system.database ?? 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs text-slate-500">Query Latency</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                        {data?.system.databaseLatencyMs ?? 0} ms
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-violet-600" />
                      System Runtime Status
                    </CardTitle>
                    <CardDescription>Backend Express API environment</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs text-slate-500">System</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-700">
                        {data?.system.status ?? 'Operational'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs text-slate-500">Environment</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                        {data?.system.environment ?? 'development'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs text-slate-500">Audit Events</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                        {auditLogs.length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === 'users' && renderUserDirectory('users')}
          {activeView === 'roles' && renderUserDirectory('roles')}

          {activeView === 'verification' && (
            <Card>
              <CardHeader>
                <CardTitle>Company Verification Queue ({companies.length})</CardTitle>
                <CardDescription>
                  Review submitted company profiles and record audited verification decisions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {companies.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No company profiles submitted yet.
                  </p>
                ) : (
                  companies.map((c) => (
                    <div
                      key={c.id}
                      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {c.displayName} ({c.legalName})
                          </p>
                          <p className="text-xs text-slate-500">
                            Owner: {c.owner?.fullName} ({c.owner?.email}) •{' '}
                            {c.headquarters || 'Location unspecified'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            c.verificationStatus === 'VERIFIED'
                              ? 'emerald'
                              : c.verificationStatus === 'REJECTED' ||
                                  c.verificationStatus === 'SUSPENDED'
                                ? 'red'
                                : 'amber'
                          }
                        >
                          {c.verificationStatus}
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={verifyReasonById[c.id] || ''}
                          onChange={(e) =>
                            setVerifyReasonById((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          placeholder="Verification decision reason..."
                          className="flex-1 bg-white"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => void handleVerifyCompany(c.id, 'VERIFIED')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleVerifyCompany(c.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {activeView === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Platform Jobs"
                  value={analytics.totals.totalJobs}
                  subtext={`${analytics.totals.publishedJobs} published`}
                  icon={Briefcase}
                  accentClass="bg-violet-50 text-violet-600"
                />
                <StatCard
                  label="Total Applications"
                  value={analytics.totals.totalApplications}
                  subtext="Across all companies"
                  icon={Users}
                  accentClass="bg-blue-50 text-blue-600"
                />
                <StatCard
                  label="Average Match Score"
                  value={
                    analytics.totals.averageMatchScore != null
                      ? `${analytics.totals.averageMatchScore}%`
                      : 'N/A'
                  }
                  subtext="Platform-wide average"
                  icon={TrendingUp}
                  accentClass="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                  label="Total Interviews"
                  value={analytics.totals.interviewsCount}
                  subtext={`${analytics.conversions.appliedToOfferPct}% offer rate`}
                  icon={BarChart3}
                  accentClass="bg-amber-50 text-amber-600"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Stage Funnel</CardTitle>
                  <CardDescription>
                    Reconciled directly from PostgreSQL application records
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                  {Object.entries(analytics.stageBreakdown).map(([stage, count]) => (
                    <div
                      key={stage}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-500">{stage}</p>
                      <p className="mt-1 font-mono text-xl font-bold text-slate-900">{count}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'audit' && (
            <Card>
              <CardHeader>
                <CardTitle>System Audit Logs ({auditLogs.length})</CardTitle>
                <CardDescription>
                  Append-only security &amp; workflow audit trail recorded in PostgreSQL
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No audit events recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 pr-4 font-semibold">Action</th>
                          <th className="py-2.5 pr-4 font-semibold">Entity</th>
                          <th className="py-2.5 pr-4 font-semibold">Actor</th>
                          <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2.5 pr-4 font-mono font-semibold text-slate-900">
                              {log.action}
                            </td>
                            <td className="py-2.5 pr-4 text-slate-600">
                              {log.entityType} ({log.entityId.slice(0, 8)}…)
                            </td>
                            <td className="py-2.5 pr-4 text-slate-700">
                              {log.actor ? `${log.actor.fullName} (${log.actor.role})` : 'System'}
                            </td>
                            <td className="py-2.5 pr-4 text-slate-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === 'profile' && (
            <AccountProfilePanel
              user={activeUser}
              workspaceLabel="Administrator Identity"
            />
          )}
          {activeView === 'settings' && <SettingsPanel user={activeUser} />}
        </>
      ) : null}
    </DashboardShell>
  );
}
