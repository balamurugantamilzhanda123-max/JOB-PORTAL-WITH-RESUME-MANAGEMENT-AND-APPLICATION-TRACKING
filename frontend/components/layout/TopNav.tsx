'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatRoleLabel, getInitials } from '@/lib/utils';
import { atsService } from '@/services/ats.service';
import { User, UserRole } from '@/types';

interface TopNavProps {
  user: User;
  title: string;
  onOpenMobileMenu: () => void;
  onNavigateView: (viewId: string) => void;
  onLogout: () => void;
}

const ROLE_BADGE_VARIANT: Record<UserRole, 'blue' | 'teal' | 'violet'> = {
  CANDIDATE: 'blue',
  RECRUITER: 'teal',
  ADMIN: 'violet',
};

export function TopNav({
  user,
  title,
  onOpenMobileMenu,
  onNavigateView,
  onLogout,
}: TopNavProps) {
  const queryClient = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => atsService.listNotifications(),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => atsService.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => atsService.markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifData?.unreadCount ?? 0;
  const items = notifData?.items ?? [];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
        </div>
        <Badge variant={ROLE_BADGE_VARIANT[user.role]} className="hidden sm:inline-flex">
          Enterprise ATS
        </Badge>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Notifications ({unreadCount} unread)
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            {items.length === 0 ? (
              <div className="py-6 text-center">
                <Bell className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-700">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-slate-500">
                  Stage updates, interview invitations, and applicant alerts appear here.
                </p>
              </div>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {items.slice(0, 12).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.readAt) markReadMutation.mutate(n.id);
                    }}
                    className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                      n.readAt
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-blue-50/70 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                      {!n.readAt && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatDate(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
                {getInitials(user.fullName)}
              </div>
              <div className="hidden max-w-[140px] sm:block">
                <p className="truncate text-xs font-semibold text-slate-900">{user.fullName}</p>
                <p className="truncate text-[11px] text-slate-500">{formatRoleLabel(user.role)}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigateView('profile')}>
              <UserIcon className="h-4 w-4 text-slate-500" />
              <span>Account Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigateView('settings')}>
              <Settings className="h-4 w-4 text-slate-500" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
