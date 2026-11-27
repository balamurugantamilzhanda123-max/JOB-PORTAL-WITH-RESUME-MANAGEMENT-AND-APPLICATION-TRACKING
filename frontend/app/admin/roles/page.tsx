'use client';

import React from 'react';
import Link from 'next/link';
import { Check, KeyRound, ShieldCheck, X } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation';

const RBAC_MATRIX = [
  { capability: 'View published jobs & search', candidate: true, recruiter: true, admin: true },
  { capability: 'Upload & manage own resumes (private Blob)', candidate: true, recruiter: false, admin: false },
  { capability: 'Submit & track own applications', candidate: true, recruiter: false, admin: false },
  { capability: 'Confirm/reschedule own interviews', candidate: true, recruiter: false, admin: false },
  { capability: 'Create/edit/publish own company jobs', candidate: false, recruiter: true, admin: false },
  { capability: 'Manage ATS Kanban pipeline for owned jobs', candidate: false, recruiter: true, admin: false },
  { capability: 'Propose interviews & submit scorecards', candidate: false, recruiter: true, admin: false },
  { capability: 'Manage user status, roles & sessions', candidate: false, recruiter: false, admin: true },
  { capability: 'Verify / suspend tenant companies', candidate: false, recruiter: false, admin: true },
  { capability: 'Explore append-only audit & retention logs', candidate: false, recruiter: false, admin: true },
];

export default function AdminRolesPage() {
  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView="roles"
      pageTitle="RBAC Policy Governance"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-violet-600" />
                Role-Based Access Control Matrix
              </CardTitle>
              <CardDescription>
                Enforced server-side via PostgreSQL role &amp; tenant ownership checks on every request
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/users">Manage User Role Assignments</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3.5 text-xs text-violet-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
              Privilege Escalation Safeguards Active
            </p>
            <p className="mt-1">
              Public registration permits Candidate and Recruiter accounts only. Admin accounts are
              provisioned exclusively via secure bootstrap CLI or existing administrator elevation,
              and administrators cannot demote or deactivate their own active account.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4">Capability</th>
                  <th className="py-2.5 pr-4 text-center">Candidate</th>
                  <th className="py-2.5 pr-4 text-center">Recruiter</th>
                  <th className="py-2.5 text-center">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RBAC_MATRIX.map((row) => (
                  <tr key={row.capability}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{row.capability}</td>
                    {[row.candidate, row.recruiter, row.admin].map((allowed, idx) => (
                      <td key={idx} className="py-3 text-center">
                        <Badge variant={allowed ? 'emerald' : 'muted'}>
                          {allowed ? (
                            <span className="inline-flex items-center gap-1">
                              <Check className="h-3 w-3" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <X className="h-3 w-3" /> No
                            </span>
                          )}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
