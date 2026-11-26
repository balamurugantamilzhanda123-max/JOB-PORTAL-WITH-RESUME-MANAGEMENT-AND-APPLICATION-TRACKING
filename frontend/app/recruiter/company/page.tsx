'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Loader2, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { ApiClientError } from '@/services/api';
import { atsService } from '@/services/ats.service';

export default function RecruiterCompanyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [sizeBand, setSizeBand] = useState('');
  const [headquarters, setHeadquarters] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-company'],
    queryFn: () => atsService.getRecruiterCompany(),
    enabled: user?.role === 'RECRUITER',
  });

  useEffect(() => {
    if (data?.company) {
      setLegalName(data.company.legalName);
      setDisplayName(data.company.displayName);
      setWebsite(data.company.website || '');
      setIndustry(data.company.industry || '');
      setSizeBand(data.company.sizeBand || '');
      setHeadquarters(data.company.headquarters || '');
      setDescription(data.company.description || '');
    }
  }, [data?.company]);

  const saveMutation = useMutation({
    mutationFn: () =>
      atsService.upsertRecruiterCompany({
        legalName: legalName.trim(),
        displayName: displayName.trim(),
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
        sizeBand: sizeBand.trim() || undefined,
        headquarters: headquarters.trim() || undefined,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Company profile saved and queued for verification review');
      void queryClient.invalidateQueries({ queryKey: ['recruiter-company'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Unable to save company profile');
    },
  });

  const company = data?.company;

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="company"
      pageTitle="Company Profile & Verification"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                Organization Profile
              </CardTitle>
              <CardDescription>
                Submit or update your company details for Admin verification
              </CardDescription>
            </div>
            {company && (
              <Badge
                variant={
                  company.verificationStatus === 'VERIFIED'
                    ? 'emerald'
                    : company.verificationStatus === 'REJECTED' ||
                        company.verificationStatus === 'SUSPENDED'
                      ? 'red'
                      : 'amber'
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {company.verificationStatus}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading company profile...
            </div>
          ) : (
            <>
              {company?.verificationReason && (
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Verification Review Note</p>
                    <p>{company.verificationReason}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="comp-legal">Legal Entity Name *</Label>
                  <Input
                    id="comp-legal"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g., Northstar Technologies Pvt Ltd"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-display">Display Name *</Label>
                  <Input
                    id="comp-display"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Northstar"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-web">Website URL</Label>
                  <Input
                    id="comp-web"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-ind">Industry</Label>
                  <Input
                    id="comp-ind"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Enterprise SaaS, Fintech"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-size">Company Size</Label>
                  <Input
                    id="comp-size"
                    value={sizeBand}
                    onChange={(e) => setSizeBand(e.target.value)}
                    placeholder="e.g., 50-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-hq">Headquarters</Label>
                  <Input
                    id="comp-hq"
                    value={headquarters}
                    onChange={(e) => setHeadquarters(e.target.value)}
                    placeholder="e.g., Chennai, India"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp-desc">About the Company</Label>
                <textarea
                  id="comp-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your company mission and engineering culture..."
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  disabled={
                    legalName.trim().length < 2 ||
                    displayName.trim().length < 2 ||
                    saveMutation.isPending
                  }
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Company Profile
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

