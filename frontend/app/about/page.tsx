import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <Card>
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Platform Overview</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">About TalentForge ATS</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              TalentForge ATS is a full-stack Recruitment Management and Applicant Tracking System structured across three role-isolated workspaces: Candidate, Recruiter / Hiring Manager, and Platform Administrator.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Architecture Highlights
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                <li>Next.js App Router + Tailwind CSS + TanStack Query frontend</li>
                <li>Node.js + Express + TypeScript REST API (/api/v1) with Swagger/OpenAPI docs</li>
                <li>PostgreSQL + Prisma ORM with transactional outbox &amp; real-time SSE feeds</li>
                <li>Argon2id credentials, rotating HttpOnly cookies, and RBAC-protected resume files</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

