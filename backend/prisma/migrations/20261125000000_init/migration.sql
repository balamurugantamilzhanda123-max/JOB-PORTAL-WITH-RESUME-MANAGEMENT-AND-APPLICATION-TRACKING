-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CANDIDATE', 'RECRUITER', 'ADMIN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "family_id" UUID NOT NULL,
    "remember_me" BOOLEAN NOT NULL DEFAULT false,
    "user_agent" VARCHAR(512),
    "ip_address" VARCHAR(64),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "file_url" TEXT,
    "parsed_json" JSONB,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_resumes_version" CHECK ("version" >= 1)
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recruiter_id" UUID NOT NULL,
    "company" VARCHAR(200) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salary_range" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "resume_id" UUID,
    "match_score" DECIMAL(5,2),
    "stage" "ApplicationStage" NOT NULL DEFAULT 'APPLIED',
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_applications_match_score" CHECK ("match_score" IS NULL OR ("match_score" >= 0 AND "match_score" <= 100))
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "rating" DECIMAL(3,2),
    "notes" TEXT,
    "interview_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_evaluations_rating" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions"("family_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "resumes_user_id_idx" ON "resumes"("user_id");

-- CreateIndex
CREATE INDEX "resumes_user_id_is_default_idx" ON "resumes"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "jobs_recruiter_id_idx" ON "jobs"("recruiter_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");

-- CreateIndex
CREATE INDEX "applications_candidate_id_idx" ON "applications"("candidate_id");

-- CreateIndex
CREATE INDEX "applications_stage_idx" ON "applications"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "uq_applications_job_candidate" ON "applications"("job_id", "candidate_id");

-- CreateIndex
CREATE INDEX "evaluations_application_id_idx" ON "evaluations"("application_id");

-- CreateIndex
CREATE INDEX "evaluations_reviewer_id_idx" ON "evaluations"("reviewer_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

