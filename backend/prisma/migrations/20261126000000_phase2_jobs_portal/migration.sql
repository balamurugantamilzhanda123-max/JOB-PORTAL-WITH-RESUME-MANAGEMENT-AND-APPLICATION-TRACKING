-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('FRESHER', 'ENTRY_LEVEL', 'ONE_TO_TWO_YEARS', 'THREE_TO_FIVE_YEARS', 'FIVE_PLUS_YEARS');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SHORT_TEXT', 'YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE');

-- AlterEnum: Replace JobStatus with DRAFT, PUBLISHED, PAUSED, CLOSED
ALTER TABLE "jobs" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "JobStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED');
ALTER TABLE "jobs" ALTER COLUMN "status" TYPE "JobStatus_new" USING (
  CASE "status"::text
    WHEN 'OPEN' THEN 'PUBLISHED'::"JobStatus_new"
    WHEN 'ARCHIVED' THEN 'CLOSED'::"JobStatus_new"
    ELSE "status"::text::"JobStatus_new"
  END
);
DROP TYPE "JobStatus";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable: Expand jobs table for Phase 2 Job Portal & Search Engine
ALTER TABLE "jobs"
  ADD COLUMN "department" VARCHAR(120) NOT NULL DEFAULT 'Engineering',
  ADD COLUMN "location" VARCHAR(200) NOT NULL DEFAULT 'Remote',
  ADD COLUMN "country" VARCHAR(100),
  ADD COLUMN "state" VARCHAR(100),
  ADD COLUMN "city" VARCHAR(100),
  ADD COLUMN "work_mode" "WorkMode" NOT NULL DEFAULT 'REMOTE',
  ADD COLUMN "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
  ADD COLUMN "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'ENTRY_LEVEL',
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "responsibilities" TEXT,
  ADD COLUMN "required_qualifications" TEXT,
  ADD COLUMN "preferred_qualifications" TEXT,
  ADD COLUMN "benefits" TEXT,
  ADD COLUMN "salary_min" INTEGER,
  ADD COLUMN "salary_max" INTEGER,
  ADD COLUMN "salary_currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
  ADD COLUMN "salary_undisclosed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "published_at" TIMESTAMPTZ(6),
  ADD CONSTRAINT "chk_jobs_salary_non_negative" CHECK ("salary_min" IS NULL OR "salary_min" >= 0),
  ADD CONSTRAINT "chk_jobs_salary_max_non_negative" CHECK ("salary_max" IS NULL OR "salary_max" >= 0),
  ADD CONSTRAINT "chk_jobs_salary_range_valid" CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max");

-- CreateTable: job_screening_questions
CREATE TABLE "job_screening_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_screening_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: job_bookmarks
CREATE TABLE "job_bookmarks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: job_audit_logs
CREATE TABLE "job_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "previous_status" "JobStatus",
    "new_status" "JobStatus" NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_work_mode_idx" ON "jobs"("work_mode");
CREATE INDEX "jobs_employment_type_idx" ON "jobs"("employment_type");
CREATE INDEX "jobs_experience_level_idx" ON "jobs"("experience_level");
CREATE INDEX "jobs_department_idx" ON "jobs"("department");
CREATE INDEX "jobs_location_idx" ON "jobs"("location");
CREATE INDEX "jobs_published_at_idx" ON "jobs"("published_at");
CREATE INDEX "jobs_required_skills_gin_idx" ON "jobs" USING GIN ("required_skills");
CREATE INDEX "jobs_fts_idx" ON "jobs" USING GIN (
  to_tsvector(
    'english',
    coalesce("title", '') || ' ' ||
    coalesce("company", '') || ' ' ||
    coalesce("department", '') || ' ' ||
    coalesce("location", '') || ' ' ||
    coalesce("summary", '') || ' ' ||
    coalesce("description", '')
  )
);

CREATE INDEX "job_screening_questions_job_id_order_index_idx" ON "job_screening_questions"("job_id", "order_index");
CREATE UNIQUE INDEX "uq_job_bookmarks_candidate_job" ON "job_bookmarks"("candidate_id", "job_id");
CREATE INDEX "job_bookmarks_candidate_id_idx" ON "job_bookmarks"("candidate_id");
CREATE INDEX "job_bookmarks_job_id_idx" ON "job_bookmarks"("job_id");
CREATE INDEX "job_audit_logs_job_id_created_at_idx" ON "job_audit_logs"("job_id", "created_at");
CREATE INDEX "job_audit_logs_actor_id_idx" ON "job_audit_logs"("actor_id");

-- AddForeignKey
ALTER TABLE "job_screening_questions" ADD CONSTRAINT "job_screening_questions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_bookmarks" ADD CONSTRAINT "job_bookmarks_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_bookmarks" ADD CONSTRAINT "job_bookmarks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_audit_logs" ADD CONSTRAINT "job_audit_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_audit_logs" ADD CONSTRAINT "job_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

