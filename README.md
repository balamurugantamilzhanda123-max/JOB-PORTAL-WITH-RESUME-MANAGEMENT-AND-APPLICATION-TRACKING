# TalentForge ATS — Enterprise Recruitment Management Platform

A production-structured, multi-role Recruitment Management & Applicant Tracking System (ATS) built with **Next.js (App Router)**, **Express.js**, **TypeScript**, **PostgreSQL**, and **Prisma ORM**.

Currently implemented:
- **Phase 1**: Foundation, Authentication, PostgreSQL Schema (5 core entities + `auth_sessions`), Argon2id Password Hashing, HttpOnly JWT + Refresh Token Rotation, RBAC Workspaces (`Candidate`, `Recruiter`, `Admin`), Swagger/OpenAPI Docs, and Automated Tests.
- **Phase 2**: Recruiter Job Management Console, 6-Section Job Posting Builder (Rich-Text Sanitization, Normalized Skills, INR/Multi-Currency Salary & Undisclosed Mode, Custom Screening Questions), Job Lifecycle & Audit Logs (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`), Candidate Split-Pane Job Explorer, PostgreSQL-Backed Search & Multi-Filtering, Bookmarks / Saved Jobs, and Real-Time SSE Feed (`job.published`, `job.updated`, `job.paused`, `job.closed`) with TanStack Query.

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

## Troubleshooting

- **Database connection refused**: Verify Docker (`docker compose ps`) or `npm run db:local` is running on port `5432` and matches `DATABASE_URL`.
- **Cookies not persisting in local browser**: Access the frontend via `http://localhost:3000` (not `127.0.0.1`) so `FRONTEND_URL` CORS origin and `localhost` cookie domain align.
- **Admin seed validation error**: `ADMIN_PASSWORD` must be at least 12 characters with uppercase, lowercase, number, and special character.

