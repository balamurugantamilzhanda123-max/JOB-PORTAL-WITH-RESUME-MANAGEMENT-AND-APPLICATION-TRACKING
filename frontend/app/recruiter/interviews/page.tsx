'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  Clock,
  ExternalLink,
  Kanban,
  Loader2,
  Star,
  User as UserIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { atsService } from '@/services/ats.service';

export default function RecruiterInterviewsPage() {
  const { user } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['recruiter-interviews'],
    queryFn: () => atsService.listRecruiterInterviews(),
    enabled: user?.role === 'RECRUITER',
  });

  const interviews = data?.interviews ?? [];

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="interviews"
      pageTitle="Interview Planner"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Scheduled Interviews ({interviews.length})
          </h2>
          <p className="text-sm text-slate-500">
            Track candidate confirmations, meeting links, and completed scorecards across all roles.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/recruiter/pipeline">
            <Kanban className="h-4 w-4" />
            Open Pipeline to Schedule
          </Link>
        </Button>
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
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" />
          Loading interview schedule...
        </div>
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews proposed yet"
          description="Open any applicant in Candidate Pipeline or ATS Pipeline and click Interview to propose a slot."
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
                      <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                      {iv.application?.candidate?.fullName} • {iv.application?.job?.title}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
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
                    <span className="text-[10px] text-slate-500">
                      Candidate: {iv.candidateResponse}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs text-slate-600">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Clock className="h-3.5 w-3.5 text-teal-600" />
                    {new Date(iv.startAt).toLocaleString()} –{' '}
                    {new Date(iv.endAt).toLocaleTimeString()}
                  </p>
                  <p className="text-slate-500">
                    {iv.timezone} • {iv.interviewType}
                  </p>
                  {iv.meetingUrl && (
                    <a
                      href={iv.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Meeting Link
                    </a>
                  )}
                </div>

                {iv.candidateNote && (
                  <p className="rounded border border-amber-200 bg-amber-50/50 p-2 text-amber-900">
                    <strong>Candidate Note:</strong> {iv.candidateNote}
                  </p>
                )}

                {iv.application?.job?.id && (
                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={`/recruiter/jobs/${iv.application.job.id}/ats`}
                      className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Manage in Job ATS Pipeline →
                    </Link>
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

