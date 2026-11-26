import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  phaseBadge?: string;
}

export function EmptyState({ icon: Icon, title, description, phaseBadge }: EmptyStateProps) {
  return (
    <Card className="border-dashed border-slate-300 bg-slate-50/50">
      <CardContent className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
          <Icon className="h-6 w-6" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {phaseBadge && <Badge variant="muted">{phaseBadge}</Badge>}
        </div>
        <p className="mt-1.5 max-w-md text-sm text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

