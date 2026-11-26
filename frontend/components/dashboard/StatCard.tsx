import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass?: string;
  phaseBadge?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  accentClass = 'bg-blue-50 text-blue-600',
  phaseBadge,
}: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', accentClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-500">{subtext}</p>
          {phaseBadge && <Badge variant="muted">{phaseBadge}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

