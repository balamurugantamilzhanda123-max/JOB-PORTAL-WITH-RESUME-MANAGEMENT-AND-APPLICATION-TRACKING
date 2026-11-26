'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import { ApiClientError } from '@/services/api';
import { atsService } from '@/services/ats.service';

export default function CandidateInterviewsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['candidate-interviews'],
    queryFn: () => atsService.listCandidateInterviews(),
    enabled: user?.role === 'CANDIDATE',
  });

  const respondMutation = useMutation({
    mutationFn: ({
      id,
      response,
    }: {
      id: string;
      response: 'ACCEPTED' | 'DECLINED' | 'RESCHEDULE_REQUESTED';
    }) =>
      atsService.respondToInterview(id, {
        response,
        note: notesById[id]?.trim() || undefined,
      }),
    onSuccess: (_res, vars) => {
      toast.success(`Interview response saved (${vars.response})`);
      void queryClient.invalidateQueries({ queryKey: ['candidate-interviews'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Unable to respond to interview');
    },
  });

  const interviews = data?.interviews ?? [];

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="interviews"
      pageTitle="Interview Schedule"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          My Interviews ({interviews.length})
        </h2>
        <p className="text-sm text-slate-500">
          Review proposed interview rounds, meeting links, and confirm or request rescheduling.
        </p>
      </div>

      {isError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error instanceof Error ? error.message : 'Unable to load interviews.'}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
          Loading interviews...
        </div>
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews scheduled yet"
          description="When a recruiter proposes an interview slot for one of your applications, it will appear here for confirmation."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {interviews.map((iv) => (
            <Card key={iv.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{iv.roundTitle}</CardTitle>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {iv.application?.job?.title} — {iv.application?.job?.company}
                    </p>
                  </div>
                  <Badge
                    variant={
                      iv.status === 'CONFIRMED'
                        ? 'emerald'
                        : iv.status === 'CANCELLED'
                          ? 'red'
                          : iv.status === 'RESCHEDULE_REQUESTED'
                            ? 'amber'
                            : 'blue'
                    }
                  >
                    {iv.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs text-slate-600">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    {new Date(iv.startAt).toLocaleString()} –{' '}
                    {new Date(iv.endAt).toLocaleTimeString()}
                  </p>
                  <p className="text-slate-500">
                    Timezone: {iv.timezone} • Type: {iv.interviewType}
                  </p>
                  {iv.location && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {iv.location}
                    </p>
                  )}
                  {iv.meetingUrl && (
                    <a
                      href={iv.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Join Meeting Link
                    </a>
                  )}
                </div>

                {iv.instructions && (
                  <p className="rounded-lg border border-slate-100 bg-white p-2.5 text-slate-700">
                    <strong>Instructions:</strong> {iv.instructions}
                  </p>
                )}

                {iv.status === 'PROPOSED' && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <Input
                      value={notesById[iv.id] || ''}
                      onChange={(e) =>
                        setNotesById((prev) => ({ ...prev, [iv.id]: e.target.value }))
                      }
                      placeholder="Optional note or preferred reschedule window..."
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={respondMutation.isPending}
                        onClick={() =>
                          respondMutation.mutate({ id: iv.id, response: 'ACCEPTED' })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accept Slot
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={respondMutation.isPending}
                        onClick={() =>
                          respondMutation.mutate({
                            id: iv.id,
                            response: 'RESCHEDULE_REQUESTED',
                          })
                        }
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Request Reschedule
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        disabled={respondMutation.isPending}
                        onClick={() =>
                          respondMutation.mutate({ id: iv.id, response: 'DECLINED' })
                        }
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

