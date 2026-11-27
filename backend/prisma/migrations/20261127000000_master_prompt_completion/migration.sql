-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "headline" VARCHAR(200),
    "phone" VARCHAR(40),
    "location" VARCHAR(160),
    "bio" TEXT,
    "experience_summary" TEXT,
    "education" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolio_url" VARCHAR(500),
    "profile_visible" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "interview_reminders" BOOLEAN NOT NULL DEFAULT true,
    "marketing_updates" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_jobs" (
    "id" UUID NOT NULL,
    "subject_type" VARCHAR(80) NOT NULL,
    "subject_id" VARCHAR(128) NOT NULL,
    "policy_key" VARCHAR(100) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "executed_at" TIMESTAMPTZ(6),
    "result" VARCHAR(500),
    "hold_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "retention_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "retention_jobs_status_scheduled_at_idx" ON "retention_jobs"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "retention_jobs_subject_type_subject_id_idx" ON "retention_jobs"("subject_type", "subject_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
