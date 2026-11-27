'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation';
import { formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';
import { CompanyVerificationStatus } from '@/types';

export default function AdminCompaniesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CompanyVerificationStatus | ''>('');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', statusFilter],
    queryFn: () => atsService.adminListCompanies(statusFilter || undefined),
    enabled: user?.role === 'ADMIN',
  });

  const verifyMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: CompanyVerificationStatus;
      reason: string;
    }) => atsService.adminVerifyCompany(id, { status, reason }),
    onSuccess: (res) => {
      toast.success(`${res.company.displayName} updated to ${res.company.verificationStatus}`);
      void queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Verification failed'),
  });

  const companies = data?.companies ?? [];

  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView="companies"
      pageTitle="Company Verification Queue"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-violet-600" />
                Tenant Employer Verification
              </CardTitle>
              <CardDescription>
                Review submitted employer metadata and record audited verification decisions
              </CardDescription>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CompanyVerificationStatus | '')}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-600" />
              Loading company queue...
            </div>
          ) : companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies matching filter"
              description="Recruiter employer profiles appear here once created under Company Profile."
            />
          ) : (
            companies.map((c) => (
              <div key={c.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{c.displayName}</h3>
                      <Badge
                        variant={
                          c.verificationStatus === 'VERIFIED'
                            ? 'emerald'
                            : c.verificationStatus === 'PENDING'
                              ? 'amber'
                              : 'red'
                        }
                      >
                        {c.verificationStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Legal: {c.legalName} • Industry: {c.industry || 'Unspecified'} • HQ:{' '}
                      {c.headquarters || 'Unspecified'}
                    </p>
                    {c.owner && (
                      <p className="mt-1 text-xs text-slate-500">
                        Owner: {c.owner.fullName} ({c.owner.email}) • Created {formatDate(c.createdAt)}
                      </p>
                    )}
                    {c.verificationReason && (
                      <p className="mt-1 text-xs text-slate-600">
                        Last decision reason: {c.verificationReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={reasonById[c.id] ?? ''}
                    onChange={(e) =>
                      setReasonById((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    placeholder="Verification reason (required, min 3 chars)..."
                    className="max-w-md"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={verifyMutation.isPending}
                    onClick={() =>
                      verifyMutation.mutate({
                        id: c.id,
                        status: 'VERIFIED',
                        reason: reasonById[c.id] || 'Employer details reviewed and verified',
                      })
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Verify
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={verifyMutation.isPending}
                    onClick={() =>
                      verifyMutation.mutate({
                        id: c.id,
                        status: 'REJECTED',
                        reason: reasonById[c.id] || 'Insufficient verification evidence',
                      })
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={verifyMutation.isPending}
                    onClick={() =>
                      verifyMutation.mutate({
                        id: c.id,
                        status: 'SUSPENDED',
                        reason: reasonById[c.id] || 'Compliance hold / suspended by admin',
                      })
                    }
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Suspend
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
