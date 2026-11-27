'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSearch, Loader2, Search } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation';
import { formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => atsService.adminListAuditLogs(),
    enabled: user?.role === 'ADMIN',
  });

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data?.logs ?? [];
    if (!q) return rows;
    return rows.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q) ||
        (l.actor?.email || '').toLowerCase().includes(q),
    );
  }, [data?.logs, query]);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hireflow-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView="audit-logs"
      pageTitle="Append-Only Audit Log Explorer"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-violet-600" />
                System Audit Trail
              </CardTitle>
              <CardDescription>
                Immutable log of security, authentication, application, evaluation, and admin actions
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter action, actor, or entity..."
                  className="pl-8"
                />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleExportJson}>
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-600" />
              Loading audit records...
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3 text-xs sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="blue">{log.action}</Badge>
                      <span className="font-semibold text-slate-900">
                        {log.entityType} ({log.entityId.slice(0, 8)}…)
                      </span>
                      {log.actor && (
                        <span className="text-slate-600">
                          by {log.actor.fullName} ({log.actor.email})
                        </span>
                      )}
                    </div>
                    {log.metadata && (
                      <p className="font-mono text-[11px] text-slate-500">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-slate-400">
                    <p>{formatDate(log.createdAt)}</p>
                    {log.ipAddress && <p>{log.ipAddress}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
