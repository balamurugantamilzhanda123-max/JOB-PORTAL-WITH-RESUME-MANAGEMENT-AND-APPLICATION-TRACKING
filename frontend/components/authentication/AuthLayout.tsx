import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50">
      {/* Left enterprise brand panel (desktop) */}
      <div className="relative hidden w-5/12 flex-col justify-between overflow-hidden bg-[#0B1221] p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.22),transparent_55%)]" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-semibold tracking-tight text-white">
                TalentForge
              </span>
              <span className="block text-xs text-slate-400">Enterprise ATS Platform</span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Phase 1 • Security & RBAC Foundation
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Precision hiring infrastructure built for modern talent teams.
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Role-isolated workspaces for candidates, hiring managers, and platform administrators—backed by PostgreSQL persistence and zero-trust session security.
          </p>

          <ul className="space-y-3 pt-2 text-sm text-slate-300">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
              <span>Argon2id credential protection &amp; HttpOnly token rotation</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
              <span>Dedicated Candidate, Recruiter &amp; Admin workspaces</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
              <span>PostgreSQL-enforced authorization &amp; relational integrity</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-6 text-xs text-slate-400">
          <span>TalentForge ATS • v1.0 Phase 1</span>
          <span>SOC2-ready foundation</span>
        </div>
      </div>

      {/* Right authentication form panel */}
      <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* Mobile brand mark */}
          <div className="flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-slate-900">TalentForge ATS</span>
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-7">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

