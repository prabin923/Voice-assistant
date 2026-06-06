-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "guest_message" TEXT NOT NULL,
    "ai_response" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "guest_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "guest_message" TEXT NOT NULL,
    "ai_response" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "staff_reply" TEXT,
    "escalation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_inventory_defaults" (
    "room_type" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "room_inventory_defaults_pkey" PRIMARY KEY ("room_type")
);

-- CreateTable
CREATE TABLE "room_inventory_overrides" (
    "room_type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "room_inventory_overrides_pkey" PRIMARY KEY ("room_type","date")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "check_in" TEXT NOT NULL,
    "check_out" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_phone" TEXT NOT NULL,
    "guest_email" TEXT,
    "guest_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "message_content" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "comment" TEXT,
    "guest_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT,
    "email" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'en-US',
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "booking_count" INTEGER NOT NULL DEFAULT 0,
    "last_visit_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_email_key" ON "hotels"("email");

-- CreateIndex
CREATE INDEX "interactions_created_at_idx" ON "interactions"("created_at");

-- CreateIndex
CREATE INDEX "interactions_guest_id_idx" ON "interactions"("guest_id");

-- CreateIndex
CREATE INDEX "bookings_guest_id_idx" ON "bookings"("guest_id");

-- CreateIndex
CREATE INDEX "bookings_status_check_in_check_out_idx" ON "bookings"("status", "check_in", "check_out");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "guests_email_key" ON "guests"("email");
