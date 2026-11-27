'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, LogOut, Monitor, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { User, UserSessionRecord } from '@/types';

export function SettingsPanel({ user }: { user: User }) {
  const { logout, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await authService.listSessions();
      setSessions(res.sessions);
    } catch {
      // Ignore transient errors on initial load
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const handleRotateSession = async () => {
    setRefreshing(true);
    try {
      await authService.refresh();
      await refreshUser();
      await loadSessions();
      toast.success('Session rotated and refreshed securely');
    } catch {
      toast.error('Failed to rotate session');
    } finally {
      setRefreshing(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setChangingPw(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadSessions();
      toast.success('Password updated and other sessions revoked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await authService.revokeSession(id);
      await loadSessions();
      toast.success('Session revoked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Update Password (Argon2id)
          </CardTitle>
          <CardDescription>
            Updating your password for {user.email} immediately revokes all other active sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="cur-pw">Current Password</Label>
              <Input
                id="cur-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="8+ chars, upper/lower/num/symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="conf-pw">Confirm New Password</Label>
              <Input
                id="conf-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={changingPw}>
                {changingPw && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Session &amp; Security Controls
              </CardTitle>
              <CardDescription>
                Manage HttpOnly JWT &amp; rotating refresh sessions stored in PostgreSQL
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotateSession}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Rotating...' : 'Rotate Current Session'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsLoading ? (
            <div className="flex items-center py-6 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading sessions...
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-3.5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Monitor className="h-4 w-4 text-slate-400" />
                    <span className="truncate text-sm font-medium text-slate-900">
                      {s.userAgent || 'Browser Session'}
                    </span>
                    {s.isCurrent && <Badge variant="blue">Current</Badge>}
                    <Badge variant={s.isActive ? 'emerald' : 'muted'}>
                      {s.isActive ? 'Active' : 'Revoked / Expired'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    IP: {s.ipAddress || 'N/A'} • Created {formatDate(s.createdAt)} • Expires{' '}
                    {formatDate(s.expiresAt)}
                  </p>
                </div>
                {s.isActive && !s.isCurrent && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={revokingId === s.id}
                    onClick={() => void handleRevokeSession(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}

          <div className="mt-4 flex flex-col justify-between gap-4 rounded-lg border border-red-200 bg-red-50/40 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-red-900">Sign Out &amp; Revoke Session</p>
              <p className="text-xs text-red-700/80">
                Immediately invalidates your current refresh session in PostgreSQL and clears authentication cookies.
              </p>
            </div>
            <Button type="button" variant="destructive" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Sign out now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
