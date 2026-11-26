# TalentForge ATS — Enterprise Recruitment Management Platform

A production-structured, multi-role Recruitment Management & Applicant Tracking System (ATS) built with **Next.js (App Router)**, **Express.js**, **TypeScript**, **PostgreSQL**, and **Prisma ORM**.

- **Phases 3–6**: Resume Vault & Parsing (PDF/DOCX text extraction, skills taxonomy, ATS Readiness Scoring, persistent storage via Vercel Blob in production), Application Submission + Snapshots + Idempotency + Withdrawal, Recruiter 6-Stage Kanban Pipeline & Immutable Stage History, Multi-Slot Interview Scheduling & Candidate Confirmation, Rubric Scorecards & Hiring Recommendation Engine, Admin Analytics & Verification Console, and User Notifications + Audit Logs.

Note: Vercel Services multi-service configuration (`services` in `vercel.json`) is in Beta on all Vercel plans and deploys both the Next.js frontend and Express backend under one single Vercel project and URL.

---

## Architecture & Folder Structure

```text
.
├── docker-compose.yml            # Local PostgreSQL 16 service
├── .env.example                  # Environment variable template
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL schema (Phase 1 + Phase 2)
│   │   └── migrations/           # SQL migrations with CHECK & GIN indexes
│   ├── scripts/
│   │   └── local-postgres.ts     # Embedded PostgreSQL runner (when Docker is absent)
│   ├── src/
│   │   ├── config/               # Zod env validation & Swagger OpenAPI spec
│   │   ├── controllers/          # Auth, Candidate, Recruiter, Admin, Job, Bookmark, Health
│   │   ├── middleware/           # Auth (DB-verified), RBAC, CSRF, Rate limiters, Errors
│   │   ├── prisma/               # PrismaClient singleton & secure Admin bootstrap seed
│   │   ├── routes/               # Versioned /api/v1/* routes
│   │   ├── services/             # Business logic, search engine, SSE event bus
│   │   ├── utils/                # Argon2id, JWT, cookies, HTML sanitization, errors
│   │   ├── validators/           # Zod request & query schemas
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/                    # Vitest + Supertest API & DB integration tests
└── frontend/
    ├── app/
    │   ├── login/
    │   ├── register/
    │   ├── candidate/
    │   │   ├── dashboard/
    │   │   ├── jobs/             # Phase 2 Split-Pane Explorer + SSE
    │   │   └── saved-jobs/       # Phase 2 Bookmarks Console
    │   ├── recruiter/
    │   │   ├── dashboard/
    │   │   └── jobs/             # Phase 2 Job Console, /create, /[id]/edit
    │   └── admin/
    │       └── dashboard/        # Real PostgreSQL stats, User & Role Management
    ├── components/
    │   ├── authentication/
    │   ├── dashboard/
    │   ├── jobs/
    │   ├── layout/
    │   ├── navigation/
    │   ├── providers/
    │   └── ui/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── types/
    ├── middleware.ts             # Route protection gate
    └── tests/                    # Playwright E2E specs
```

---

## Local Setup & Execution

### 1. Configure Environment Variables

Copy `.env.example` to `.env` at the project root (and/or `backend/.env`), and generate strong 64-byte hex secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Ensure `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are set.

### 2. Start PostgreSQL

**Option A — Docker Compose (Recommended):**
```bash
docker compose up -d
```

**Option B — Built-in Local PostgreSQL (if Docker/PostgreSQL is not installed locally):**
```bash
cd backend
npm run db:local
```

### 3. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Run Prisma Migrations & Secure Admin Seed

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

### 5. Run Backend & Frontend Servers

In terminal 1 (Backend API on `http://localhost:4000`):
```bash
cd backend
npm run dev
```

In terminal 2 (Frontend Next.js App on `http://localhost:3000`):
```bash
cd frontend
npm run dev
```

---

## API Documentation

Interactive Swagger / OpenAPI documentation is served by the backend at:
- `http://localhost:4000/api/v1/docs` (and `/api-docs`)
- OpenAPI JSON spec: `http://localhost:4000/api/v1/docs.json`

---

## Automated Testing

### Backend Integration & Database Tests (Vitest + Supertest)
```bash
cd backend
npm test
```

### Frontend End-to-End Tests (Playwright)
Ensure PostgreSQL, Backend (`4000`), and Frontend (`3000`) are running, then:
```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

---

## Vercel-Only Single-Project Deployment Guide

This repository uses [Vercel Services](https://vercel.com/docs/services) (Beta on all Vercel plans) declared in root [vercel.json](./vercel.json) so both the Next.js App Router frontend (`frontend/`) and Express + Prisma backend (`backend/`) build and ship together under one Vercel domain.

### 1. Vercel Project Settings
When importing the GitHub repository in Vercel Dashboard (**Add New -> Project**):

| Setting | Value |
| --- | --- |
| **Root Directory** | `.` (leave empty / repository root) |
| **Framework Preset** | **Other** (auto-governed by `services` in `vercel.json`: `frontend` uses `nextjs`, `backend` uses `express`) |
| **Build Command** | Leave empty at project level (overridden per service in `vercel.json`: `backend` runs `npx prisma generate && npm run build`; `frontend` runs Next.js build) |
| **Output Directory** | Leave empty / default (managed per service) |
| **Install Command** | Leave default (each service installs its own `package.json`; `backend` runs `postinstall` -> `prisma generate`) |

### 2. Required Environment Variables
Set the following in **Vercel Project -> Settings -> Environment Variables** (Production & Preview):

- **Database (auto-provisioned via Marketplace integration, see Step 3):**
  - `DATABASE_URL` (direct PostgreSQL URL, used by Prisma CLI migrations and fallback runtime)
  - `DATABASE_URL_POOLED` or `POSTGRES_PRISMA_URL` *(auto-set by Prisma Postgres / Neon for pooled serverless connections; preferred automatically at runtime)*
- **Authentication & Security (Required Secrets — generate 64-byte hex strings):**
  - `JWT_ACCESS_SECRET` (min 32 chars)
  - `JWT_REFRESH_SECRET` (min 32 chars)
- **Persistent Resume Storage (auto-provisioned via Vercel Blob, see Step 4):**
  - `BLOB_READ_WRITE_TOKEN` *(or `BLOB_STORE_ID` via OIDC)*
  - `BLOB_ACCESS` *(optional; set to `private` for Private Blob Store or `public` for Public Blob Store; defaults to `private`)*
- **Admin Bootstrap Seed (required only when running `prisma:seed`):**
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD` *(min 12 chars with uppercase, lowercase, number, and symbol)*
  - `ADMIN_FULL_NAME` *(optional, defaults to `Platform Administrator`)*
- **Optional App / Origin Overrides:**
  - `NEXT_PUBLIC_API_URL=/api/v1` *(default is already `/api/v1` same-origin)*
  - `FRONTEND_URL` *(optional override; automatically defaults to `https://$VERCEL_PROJECT_PRODUCTION_URL` / `https://$VERCEL_URL` on Vercel)*
  - `BACKEND_URL` *(optional override; automatically defaults to the same Vercel origin)*
  - `ALLOWED_ORIGINS` *(optional comma-separated list for extra custom domains)*
  - `ACCESS_TOKEN_EXPIRY=15m`
  - `REFRESH_TOKEN_EXPIRY=7d`

### 3. PostgreSQL Database Setup (Vercel Marketplace)
1. In your Vercel project, go to **Storage / Integrations -> Browse Marketplace** and add **Prisma Postgres** (`vercel integration add prisma`) or **Neon Postgres** (`vercel integration add neon`).
2. Connect the database to **Production**, **Preview**, and **Development**.
3. Apply existing Prisma migrations without resetting or losing records:
   ```bash
   cd backend
   npx vercel env pull .env --environment=production
   npx prisma migrate deploy
   npm run prisma:seed
   ```
   *(Optionally run `npm run prisma:demo-seed` if you want initial demo jobs and users.)*

### 4. Persistent Resume Storage Setup (Vercel Blob)
1. In Vercel Project -> **Storage -> Create Database -> Blob**, create a **Private** Blob store named e.g. `hireflow-resumes` and connect it to the project.
2. Confirm `BLOB_READ_WRITE_TOKEN` (and/or `BLOB_STORE_ID`) appears in Environment Variables.
3. Resumes are stored persistently under `resumes/<userId>/<uuid>.<pdf|docx>`, while downloads continue going through RBAC-verified `/api/v1/resumes/:id/download`.

### 5. Deploy & Production Smoke Test
1. Trigger a deploy from Vercel Dashboard or push to `main` on GitHub.
2. Once the deployment is **Ready**, open `https://<your-deployment-domain>` and verify:
   - `GET https://<your-deployment-domain>/api/v1/health` returns `{ "success": true, ... }` with PostgreSQL `connected: true`.
   - Homepage (`/`) and Public Job Board (`/candidate/jobs`) load cleanly without `404` or `localhost` console errors.
   - Register/Sign In (`/login`, `/register`) sets `HttpOnly` + `Secure` cookies and lands in the matching role dashboard (`/candidate/dashboard`, `/recruiter/dashboard`, `/admin/dashboard`).
   - Upload a PDF/DOCX resume in `/candidate/resumes`, verify parsed skills + download (`/api/v1/resumes/:id/download`).
   - Post/Publish a job as Recruiter, apply as Candidate, move pipeline stages + schedule/confirm an interview, submit evaluation scorecard, and check Admin Analytics (`/admin/dashboard`).

---

## Troubleshooting

- **Database connection refused**: Verify Docker (`docker compose ps`) or `npm run db:local` is running on port `5432` and matches `DATABASE_URL`.
- **Cookies not persisting in local browser**: Access the frontend via `http://localhost:3000` (not `127.0.0.1`) so `FRONTEND_URL` CORS origin and `localhost` cookie domain align.
- **Admin seed validation error**: `ADMIN_PASSWORD` must be at least 12 characters with uppercase, lowercase, number, and special character.

