'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/jobs.service';

export function useUserRealtimeStream(enabled: boolean) {
  const queryClient = useQueryClient();
  const retryDelayRef = useRef(2000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    let disposed = false;
    let source: EventSource | null = null;
    let connectedOnce = false;

    const connect = () => {
      if (disposed) return;

      source = new EventSource(`${API_BASE_URL}/notifications/stream`, {
        withCredentials: true,
      });

      source.addEventListener('connected', () => {
        if (disposed) return;
        const wasReconnect = connectedOnce;
        connectedOnce = true;
        retryDelayRef.current = 2000;
        if (wasReconnect) {
          void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          void queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
          void queryClient.invalidateQueries({ queryKey: ['candidate-interviews'] });
          void queryClient.invalidateQueries({ queryKey: ['recruiter-pipeline'] });
          void queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] });
        }
      });

      const handleEvent = (type: string) => (event: MessageEvent) => {
        if (disposed) return;
        try {
          const data = JSON.parse(event.data) as {
            payload?: { jobTitle?: string; stage?: string; roundTitle?: string; response?: string };
          };
          if (type === 'application.submitted') {
            toast.info(`New application received for ${data.payload?.jobTitle || 'a job'}`);
          } else if (type === 'application.stage_changed') {
            toast.info(
              `Application status updated to ${data.payload?.stage || 'next stage'}`,
            );
          } else if (type === 'interview.proposed') {
            toast.info(
              `New interview proposed: ${data.payload?.roundTitle || 'Interview round'}`,
            );
          } else if (type === 'interview.responded') {
            toast.info(`Candidate responded: ${data.payload?.response || 'Updated'}`);
          }
        } catch {
          // ignore parse errors
        }

        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
        void queryClient.invalidateQueries({ queryKey: ['candidate-interviews'] });
        void queryClient.invalidateQueries({ queryKey: ['recruiter-pipeline'] });
        void queryClient.invalidateQueries({ queryKey: ['recruiter-job-applicants'] });
        void queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] });
      };

      source.addEventListener('application.submitted', handleEvent('application.submitted'));
      source.addEventListener('application.stage_changed', handleEvent('application.stage_changed'));
      source.addEventListener('interview.proposed', handleEvent('interview.proposed'));
      source.addEventListener('interview.responded', handleEvent('interview.responded'));

      source.onerror = () => {
        if (disposed) return;
        source?.close();
        source = null;
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(delay * 2, 30000);
        timerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    // Cross-instance serverless sync fallback for notifications, applications, and interviews
    const pollTimer = setInterval(() => {
      if (disposed || document.visibilityState !== 'visible') return;
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-interviews'] });
      void queryClient.invalidateQueries({ queryKey: ['recruiter-pipeline'] });
      void queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] });
    }, 15000);

    return () => {
      disposed = true;
      clearInterval(pollTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      source?.close();
    };
  }, [enabled, queryClient]);
}

