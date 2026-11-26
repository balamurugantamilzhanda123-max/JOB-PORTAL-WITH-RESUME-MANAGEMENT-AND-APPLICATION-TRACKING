'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, LogOut, Sparkles, X } from 'lucide-react';
import { cn, formatRoleLabel } from '@/lib/utils';
import { UserRole } from '@/types';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  phaseBadge?: string;
  disabled?: boolean;
}

interface SidebarProps {
  role: UserRole;
  items: SidebarNavItem[];
  activeView: string;
  onSelectView: (viewId: string) => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const ROLE_ACCENT: Record<UserRole, { pill: string; active: string }> = {
  CANDIDATE: {
    pill: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
    active: 'bg-blue-600/20 text-white border-l-2 border-blue-400',
  },
  RECRUITER: {
    pill: 'bg-teal-500/15 text-teal-300 border-teal-400/30',
    active: 'bg-teal-600/20 text-white border-l-2 border-teal-400',
  },
  ADMIN: {
    pill: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
    active: 'bg-violet-600/20 text-white border-l-2 border-violet-400',
  },
};

export function Sidebar({
  role,
  items,
  activeView,
  onSelectView,
  onLogout,
  isLoggingOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const accent = ROLE_ACCENT[role];

  const navContent = (
    <div className="flex h-full flex-col bg-[#0B1221] text-slate-300">
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">TalentForge</p>
            <p className="text-[11px] font-medium text-slate-400">Enterprise ATS</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className={cn('rounded-lg border px-3 py-2 text-xs font-medium', accent.pill)}>
          <span className="block text-[10px] uppercase tracking-wider opacity-75">Workspace</span>
          <span className="mt-0.5 block font-semibold">{formatRoleLabel(role)}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Workspace navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = !item.disabled && activeView === item.id;

          if (item.disabled) {
            return (
              <button
                key={item.id}
                type="button"
                disabled
                aria-disabled="true"
                title={`Coming in ${item.phaseBadge}`}
                className="flex w-full cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 opacity-75"
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.phaseBadge && (
                  <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    <Lock className="h-2.5 w-2.5" />
                    {item.phaseBadge}
                  </span>
                )}
              </button>
            );
          }

          const classes = cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
            isActive
              ? accent.active
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={classes}
              >
                <Icon
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={classes}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:block">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] shadow-2xl">{navContent}</aside>
        </div>
      )}
    </>
  );
}
