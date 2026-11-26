import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function TermsPage() {
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
              <FileText className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Terms of Use</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Platform Terms</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              This platform enforces strict role-based isolation across Candidate, Recruiter, and Administrator accounts. Sample companies and job vacancies marked DEMO are synthetic test fixtures and do not represent live employment offers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

