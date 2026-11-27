'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Loader2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export function NotificationsCenter() {
  const queryClient = useQueryClient();
  const [filterUnread, setFilterUnread] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => atsService.listNotifications(),
  });

  const { data: prefsData } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => atsService.getNotificationPreferences(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => atsService.markNotificationRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => atsService.markAllNotificationsRead(),
    onSuccess: () => {
      toast.success('All notifications marked read');
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const updatePrefMutation = useMutation({
    mutationFn: (patch: {
      emailNotifications?: boolean;
      interviewReminders?: boolean;
      marketingUpdates?: boolean;
    }) => atsService.updateNotificationPreferences(patch),
    onSuccess: () => {
      toast.success('Notification preferences saved');
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to save preferences'),
  });

  const items = (data?.items ?? []).filter((item) => (!filterUnread ? true : !item.readAt));
  const prefs = prefsData?.preferences;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  Notifications Inbox
                  {(data?.unreadCount ?? 0) > 0 && (
                    <Badge variant="blue">{data?.unreadCount} unread</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Persisted workflow alerts delivered via SSE + database query sync
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={filterUnread ? 'primary' : 'outline'}
                  onClick={() => setFilterUnread((v) => !v)}
                >
                  {filterUnread ? 'Showing Unread' : 'Unread Only'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!data?.unreadCount || markAllMutation.isPending}
                  onClick={() => markAllMutation.mutate()}
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
                Loading notifications...
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title={filterUnread ? 'No unread alerts' : 'No notifications yet'}
                description="Real-time updates on job applications, stage transitions, and interview proposals appear here automatically."
              />
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex flex-col justify-between gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-start',
                    n.readAt ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40',
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                      <Badge variant="muted">{n.type}</Badge>
                      {!n.readAt && <Badge variant="blue">Unread</Badge>}
                    </div>
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.readAt && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(n.id)}
                    >
                      <Check className="h-4 w-4" />
                      Mark read
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4 text-slate-600" />
            Delivery Preferences
          </CardTitle>
          <CardDescription>
            Control optional notification channels (transactional security notices stay enabled)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <div>
              <span className="font-medium text-slate-900">Application &amp; Stage Alerts</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Receive email alerts alongside in-app updates (sandbox mode when unconfigured)
              </span>
            </div>
            <input
              type="checkbox"
              checked={prefs?.emailNotifications ?? true}
              onChange={(e) =>
                updatePrefMutation.mutate({ emailNotifications: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <div>
              <span className="font-medium text-slate-900">Interview Reminders</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Alerts for proposed slots, confirmations, and reschedule responses
              </span>
            </div>
            <input
              type="checkbox"
              checked={prefs?.interviewReminders ?? true}
              onChange={(e) =>
                updatePrefMutation.mutate({ interviewReminders: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <div>
              <span className="font-medium text-slate-900">Weekly Digest Updates</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Optional summary of saved searches and hiring activity
              </span>
            </div>
            <input
              type="checkbox"
              checked={prefs?.marketingUpdates ?? false}
              onChange={(e) =>
                updatePrefMutation.mutate({ marketingUpdates: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
