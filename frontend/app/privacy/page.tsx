import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPage() {
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
              <Lock className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Privacy Notice</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Data Privacy &amp; Protection</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              TalentForge ATS collects only the account, resume, and application records necessary to evaluate candidacies. Uploaded resume files are stored privately and accessed strictly via authenticated, role-verified downloads.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Automated resume parsing and match scores serve purely as transparent, advisory summaries for human review and never autonomously reject candidates.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

