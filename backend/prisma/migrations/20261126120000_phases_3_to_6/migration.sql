-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "InterviewStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "CandidateInterviewResponse" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'RESCHEDULE_REQUESTED');
CREATE TYPE "CompanyVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "NotificationType" AS ENUM (
  'APPLICATION_SUBMITTED',
  'STAGE_CHANGED',
  'INTERVIEW_PROPOSED',
  'INTERVIEW_RESPONDED',
  'JOB_STATUS_CHANGED',
  'COMPANY_VERIFICATION',
  'ACCOUNT_SECURITY'
);

-- CreateTable: companies
CREATE TABLE "companies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "legal_name" VARCHAR(200) NOT NULL,
  "display_name" VARCHAR(200) NOT NULL,
  "website" VARCHAR(500),
  "industry" VARCHAR(150),
  "size_band" VARCHAR(80),
  "headquarters" VARCHAR(200),
  "description" TEXT,
  "verification_status" "CompanyVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verified_by_id" UUID,
  "verified_at" TIMESTAMPTZ(6),
  "verification_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_owner_id_key" ON "companies"("owner_id");
CREATE INDEX "companies_verification_status_idx" ON "companies"("verification_status");

-- AlterTable: resumes
ALTER TABLE "resumes"
  ADD COLUMN "object_key" VARCHAR(512),
  ADD COLUMN "file_name" VARCHAR(255),
  ADD COLUMN "mime_type" VARCHAR(150),
  ADD COLUMN "file_size" INTEGER,
  ADD COLUMN "checksum" VARCHAR(128),
  ADD COLUMN "parse_status" "ParseStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "parse_error" VARCHAR(500),
  ADD COLUMN "parser_version" VARCHAR(40) NOT NULL DEFAULT '1.0.0';

-- CreateTable: resume_parse_jobs
CREATE TABLE "resume_parse_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "resume_id" UUID NOT NULL,
  "status" "ParseStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error_code" VARCHAR(100),
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "parser_version" VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "resume_parse_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "resume_parse_jobs_resume_id_created_at_idx" ON "resume_parse_jobs"("resume_id", "created_at");

-- AlterTable: applications
ALTER TABLE "applications"
  ADD COLUMN "resume_snapshot" JSONB,
  ADD COLUMN "score_breakdown" JSONB,
  ADD COLUMN "screening_answers" JSONB,
  ADD COLUMN "cover_note" TEXT,
  ADD COLUMN "idempotency_key" VARCHAR(128);
CREATE UNIQUE INDEX "applications_idempotency_key_key" ON "applications"("idempotency_key");

-- CreateTable: application_events
CREATE TABLE "application_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "actor_id" UUID,
  "from_stage" "ApplicationStage",
  "to_stage" "ApplicationStage" NOT NULL,
  "event_type" VARCHAR(80) NOT NULL,
  "public_note" TEXT,
  "internal_note" TEXT,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "application_events_application_id_occurred_at_idx" ON "application_events"("application_id", "occurred_at");

-- CreateTable: interviews
CREATE TABLE "interviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "organizer_id" UUID NOT NULL,
  "round_title" VARCHAR(150) NOT NULL,
  "interview_type" VARCHAR(80) NOT NULL DEFAULT 'Technical',
  "start_at" TIMESTAMPTZ(6) NOT NULL,
  "end_at" TIMESTAMPTZ(6) NOT NULL,
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata',
  "meeting_url" VARCHAR(500),
  "location" VARCHAR(250),
  "instructions" TEXT,
  "status" "InterviewStatus" NOT NULL DEFAULT 'PROPOSED',
  "candidate_response" "CandidateInterviewResponse" NOT NULL DEFAULT 'PENDING',
  "candidate_note" TEXT,
  "responded_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "interviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_interviews_time_range" CHECK ("end_at" > "start_at")
);
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");
CREATE INDEX "interviews_organizer_id_idx" ON "interviews"("organizer_id");
CREATE INDEX "interviews_start_at_idx" ON "interviews"("start_at");

-- AlterTable: evaluations
ALTER TABLE "evaluations"
  ADD COLUMN "interview_id" UUID,
  ADD COLUMN "criteria" JSONB,
  ADD COLUMN "recommendation" VARCHAR(40),
  ADD COLUMN "is_candidate_visible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "evaluations_interview_id_idx" ON "evaluations"("interview_id");

-- CreateTable: notifications
CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB,
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" UUID,
  "action" VARCHAR(120) NOT NULL,
  "entity_type" VARCHAR(80) NOT NULL,
  "entity_id" VARCHAR(128) NOT NULL,
  "metadata" JSONB,
  "ip_address" VARCHAR(64),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateTable: outbox_events
CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(100) NOT NULL,
  "aggregate_type" VARCHAR(80) NOT NULL,
  "aggregate_id" VARCHAR(128) NOT NULL,
  "payload" JSONB NOT NULL,
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_events_published_at_created_at_idx" ON "outbox_events"("published_at", "created_at");

-- AddForeignKeys
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resume_parse_jobs" ADD CONSTRAINT "resume_parse_jobs_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

