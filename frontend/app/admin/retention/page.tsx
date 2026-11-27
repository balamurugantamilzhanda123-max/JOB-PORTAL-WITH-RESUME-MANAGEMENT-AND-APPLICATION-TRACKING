'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, Loader2, Lock, Play, Plus, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation';
import { formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export default function AdminRetentionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [subjectType, setSubjectType] = useState<
    'CandidateProfile' | 'Resume' | 'Application' | 'AuthSession'
  >('AuthSession');
  const [subjectId, setSubjectId] = useState('expired-sessions-batch');
  const [policyKey, setPolicyKey] = useState('expired_sessions_30d');
  const [holdReason, setHoldReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-retention-jobs'],
    queryFn: () => atsService.adminListRetention(),
    enabled: user?.role === 'ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      atsService.adminCreateRetention({
        subjectType,
        subjectId,
        policyKey,
        holdReason: holdReason || undefined,
      }),
    onSuccess: () => {
      toast.success('Retention policy job scheduled');
      setHoldReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin-retention-jobs'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to schedule job'),
  });

  const holdMutation = useMutation({
    mutationFn: ({ id, hold, reason }: { id: string; hold: boolean; reason?: string }) =>
      atsService.adminToggleRetentionHold(id, { hold, holdReason: reason }),
    onSuccess: () => {
      toast.success('Retention hold status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-retention-jobs'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to update hold'),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => atsService.adminExecuteRetention(id),
    onSuccess: (res) => {
      toast.success(res.job.result || 'Retention policy executed');
      void queryClient.invalidateQueries({ queryKey: ['admin-retention-jobs'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to execute job'),
  });

  const jobs = data?.jobs ?? [];

  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView="retention"
      pageTitle="Data Retention & Legal Holds"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseZap className="h-5 w-5 text-violet-600" />
              Schedule Retention Policy Execution
            </CardTitle>
            <CardDescription>
              Manage retention workflows and enforce legal holds to block deletion on held records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="grid gap-4 sm:grid-cols-4"
            >
              <div>
                <Label htmlFor="ret-type">Subject Category</Label>
                <select
                  id="ret-type"
                  value={subjectType}
                  onChange={(e) =>
                    setSubjectType(
                      e.target.value as
                        | 'CandidateProfile'
                        | 'Resume'
                        | 'Application'
                        | 'AuthSession',
                    )
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="AuthSession">Expired Auth Sessions</option>
                  <option value="Resume">Resume Records</option>
                  <option value="Application">Application Records</option>
                  <option value="CandidateProfile">Candidate Profile</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ret-id">Subject / Scope ID</Label>
                <Input
                  id="ret-id"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ret-key">Policy Key</Label>
                <Input
                  id="ret-key"
                  value={policyKey}
                  onChange={(e) => setPolicyKey(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ret-hold">Optional Legal Hold Reason</Label>
                <Input
                  id="ret-hold"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Leave blank if no hold"
                />
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <Button type="submit" variant="primary" size="sm" disabled={createMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Schedule Retention Job
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduled &amp; Executed Retention Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            ) : jobs.length === 0 ? (
              <p className="text-xs text-slate-500">No retention jobs scheduled yet.</p>
            ) : (
              jobs.map((j) => (
                <div
                  key={j.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-3.5 text-sm sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {j.subjectType} • {j.policyKey}
                      </span>
                      <Badge
                        variant={
                          j.status === 'EXECUTED'
                            ? 'emerald'
                            : j.status === 'ON_HOLD'
                              ? 'amber'
                              : 'blue'
                        }
                      >
                        {j.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Target: {j.subjectId} • Scheduled: {formatDate(j.scheduledAt)}
                    </p>
                    {j.holdReason && (
                      <p className="text-xs text-amber-800">Hold reason: {j.holdReason}</p>
                    )}
                    {j.result && <p className="text-xs text-emerald-700">{j.result}</p>}
                  </div>
                  {j.status !== 'EXECUTED' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {j.status === 'ON_HOLD' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => holdMutation.mutate({ id: j.id, hold: false })}
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          Release Hold
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            holdMutation.mutate({
                              id: j.id,
                              hold: true,
                              reason: 'Compliance / audit review hold',
                            })
                          }
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Place Hold
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={j.status === 'ON_HOLD' || executeMutation.isPending}
                        onClick={() => executeMutation.mutate(j.id)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Execute Now
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
