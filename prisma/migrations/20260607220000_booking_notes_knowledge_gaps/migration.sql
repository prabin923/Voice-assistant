-- AlterTable
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "special_requests" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "knowledge_gaps" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "guest_message" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en-US',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_gaps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_gaps_status_idx" ON "knowledge_gaps"("status");
