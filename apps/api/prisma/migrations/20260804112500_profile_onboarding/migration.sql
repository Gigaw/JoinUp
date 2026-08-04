-- Preserve existing users while aligning authentication and onboarding with the accepted data model.
ALTER TABLE "users" ADD COLUMN "email_normalized" VARCHAR(254);
UPDATE "users" SET "email_normalized" = LOWER(TRIM("email"));
ALTER TABLE "users" ALTER COLUMN "email_normalized" SET NOT NULL;

ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ;
UPDATE "users"
SET "onboarding_completed_at" = "created_at"
WHERE "onboarding_completed" = true;

DROP INDEX "users_email_key";
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");
ALTER TABLE "users" DROP COLUMN "onboarding_completed";
