'use client';

import React, { useState } from 'react';
import { KeyRound, LogOut, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { User } from '@/types';

export function SettingsPanel({ user }: { user: User }) {
  const { logout, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRotateSession = async () => {
    setRefreshing(true);
    try {
      await authService.refresh();
      await refreshUser();
      toast.success('Session rotated and refreshed securely');
    } catch {
      toast.error('Failed to rotate session');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Session &amp; Security Controls
          </CardTitle>
          <CardDescription>
            Manage your active HttpOnly authentication session and security preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">Refresh Token Rotation</p>
              <p className="text-xs text-slate-500">
                Rotate your HttpOnly refresh cookie and issue a new short-lived JWT access token.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotateSession}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Rotating...' : 'Rotate Session'}
            </Button>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Password &amp; MFA Management</p>
                <Badge variant="muted">Future Phase</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Account credentials for {user.email} are hashed with Argon2id. Self-service password updates arrive in a future phase.
              </p>
            </div>
            <KeyRound className="hidden h-5 w-5 text-slate-300 sm:block" />
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-lg border border-red-200 bg-red-50/40 p-4 sm:flex-row sm:items-center">
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

