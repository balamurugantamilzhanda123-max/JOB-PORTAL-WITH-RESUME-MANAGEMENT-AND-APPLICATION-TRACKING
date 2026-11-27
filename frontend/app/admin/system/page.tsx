'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, HardDrive, Loader2, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation';
import { formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export default function AdminSystemPage() {
  const { user } = useAuth();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => atsService.adminGetSystemHealth(),
    enabled: user?.role === 'ADMIN',
  });

  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView="system"
      pageTitle="System Readiness & Diagnostics"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Redacted infrastructure health check (secrets and connection strings never exposed).
          {data?.checkedAt && ` Checked ${formatDate(data.checkedAt)}`}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Re-check Health
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-600" />
          Checking system subsystems...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-emerald-600" />
                API &amp; Runtime
              </CardTitle>
              <CardDescription>{data.deploymentPlatform}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <Badge variant="emerald">{data.api.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Environment</span>
                <span className="font-medium">{data.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Node Version</span>
                <span className="font-mono text-xs">{data.api.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Instance Uptime</span>
                <span>{data.api.uptimeSeconds}s</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-blue-600" />
                PostgreSQL Database
              </CardTitle>
              <CardDescription>Primary transactional store via Prisma ORM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Connection</span>
                <Badge variant={data.database.status === 'connected' ? 'emerald' : 'red'}>
                  {data.database.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Query Latency</span>
                <span>{data.database.latencyMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Serverless Pooler</span>
                <span>{data.database.pooledRuntimeEnabled ? 'Enabled' : 'Direct'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="h-4 w-4 text-violet-600" />
                Resume Object Storage
              </CardTitle>
              <CardDescription>RBAC-authorized resume delivery via API proxy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Provider</span>
                <span className="font-medium">{data.storage.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Access Policy</span>
                <Badge variant="blue">{data.storage.accessMode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Configured</span>
                <Badge variant={data.storage.configured ? 'emerald' : 'red'}>
                  {data.storage.configured ? 'Ready' : 'Action Required'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-teal-600" />
                Events, Outbox &amp; Security
              </CardTitle>
              <CardDescription>SSE stream + query sync &amp; session hygiene</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Transport</span>
                <span className="text-right text-xs font-medium">{data.eventsAndQueues.transport}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outbox Events (Pending / Total)</span>
                <span>
                  {data.eventsAndQueues.outboxPendingCount} / {data.eventsAndQueues.outboxTotalCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Auth Sessions</span>
                <span>{data.security.activeSessionsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Secure Cookies &amp; Email Mode</span>
                <span className="inline-flex items-center gap-1 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {data.security.cookieSecureFlag ? 'HTTPS Secure' : 'Local HTTP'} •{' '}
                  {data.security.emailProviderMode}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
