'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Database,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/utils';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              TalentForge <span className="font-normal text-slate-500">ATS</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isLoading && user ? (
              <Button asChild variant="primary" size="sm">
                <Link href={getDashboardRouteForRole(user.role)}>
                  Open Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="blue" className="mb-4">
            Phase 1 • Foundation, Authentication &amp; PostgreSQL Core
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Enterprise Recruitment &amp; Applicant Tracking Architecture
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            A multi-role SaaS platform engineered with Next.js, Express, TypeScript, and PostgreSQL—delivering Argon2id credential security, HttpOnly refresh token rotation, and strict role-based workspaces.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {!isLoading && user ? (
              <Button asChild variant="primary" size="lg">
                <Link href={getDashboardRouteForRole(user.role)}>
                  Continue to your dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="primary" size="lg">
                  <Link href="/register">
                    Create an account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Sign in to workspace</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Role Workspaces Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">Candidate Workspace</h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Dedicated career hub prepared for multi-version resume vaults, job discovery, and application tracking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">Recruiter Workspace</h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Hiring manager portal structured for requisition management, ATS pipelines, and interview scorecards.
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">Admin Console</h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Restricted governance workspace with live PostgreSQL user metrics, role controls, and health telemetry.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Technical Pillars */}
        <div className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Zero-Trust Cookies</p>
              <p className="text-xs text-slate-500">
                HttpOnly JWT &amp; rotating refresh sessions with reuse detection.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Server-Verified RBAC</p>
              <p className="text-xs text-slate-500">
                Every protected API validates current database role and status.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">5-Entity PostgreSQL Core</p>
              <p className="text-xs text-slate-500">
                Users, Resumes, Jobs, Applications, and Evaluations migrated via Prisma.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

