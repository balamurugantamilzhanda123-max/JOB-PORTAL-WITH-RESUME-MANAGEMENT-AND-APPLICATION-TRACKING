'use client';

import React from 'react';
import { Calendar, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatRoleLabel } from '@/lib/utils';
import { User } from '@/types';

interface AccountProfilePanelProps {
  user: User;
  workspaceLabel: string;
}

export function AccountProfilePanel({ user, workspaceLabel }: AccountProfilePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{workspaceLabel}</CardTitle>
            <CardDescription>
              Verified account identity stored in PostgreSQL
            </CardDescription>
          </div>
          <Badge variant={user.isActive ? 'emerald' : 'red'}>
            {user.isActive ? 'Active Account' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
          <UserIcon className="mt-0.5 h-4 w-4 text-slate-400" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Full Name</p>
            <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
          <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Email Address</p>
            <p className="truncate text-sm font-semibold text-slate-900">{user.email}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-slate-400" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Assigned RBAC Role</p>
            <p className="text-sm font-semibold text-slate-900">{formatRoleLabel(user.role)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
          <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Account Created</p>
            <p className="text-sm font-semibold text-slate-900">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

