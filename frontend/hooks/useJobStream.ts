'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/jobs.service';

export function useJobStream(enabled: boolean) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const retryDelayRef = useRef(1500);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    let isDisposed = false;
    let source: EventSource | null = null;
    let hasConnectedOnce = false;

    const connect = () => {
      if (isDisposed) return;

      source = new EventSource(`${API_BASE_URL}/candidate/jobs/stream`, {
        withCredentials: true,
      });

      source.addEventListener('connected', () => {
        if (isDisposed) return;
        setConnected(true);
        const wasReconnect = hasConnectedOnce;
        hasConnectedOnce = true;
        retryDelayRef.current = 1500;
        if (wasReconnect) {
          void queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] });
          void queryClient.invalidateQueries({ queryKey: ['candidate-bookmarks'] });
        }
      });

      const handleUpdate = (event: MessageEvent) => {
        if (isDisposed) return;
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            job?: { title?: string; company?: string };
          };
          if (payload.type === 'job.published' && payload.job?.title) {
            toast.info(`New role published: ${payload.job.title} at ${payload.job.company}`);
          }
        } catch {
          // Ignore malformed event payloads
        }
        void queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] });
        void queryClient.invalidateQueries({ queryKey: ['candidate-job-detail'] });
        void queryClient.invalidateQueries({ queryKey: ['candidate-bookmarks'] });
      };

      source.addEventListener('job.published', handleUpdate);
      source.addEventListener('job.updated', handleUpdate);
      source.addEventListener('job.paused', handleUpdate);
      source.addEventListener('job.closed', handleUpdate);

      source.onerror = () => {
        if (isDisposed) return;
        setConnected(false);
        source?.close();
        source = null;

        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(delay * 2, 30000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    // Cross-instance serverless sync fallback: refresh active queries periodically while tab is visible
    const pollTimer = setInterval(() => {
      if (isDisposed || document.visibilityState !== 'visible') return;
      void queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-bookmarks'] });
    }, 15000);

    return () => {
      isDisposed = true;
      setConnected(false);
      clearInterval(pollTimer);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      source?.close();
    };
  }, [enabled, queryClient]);

  return { connected };
}

