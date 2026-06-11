CREATE TABLE "dining_reservations" (
    "id" TEXT NOT NULL,
    "venue_name" TEXT NOT NULL,
    "reservation_date" TEXT NOT NULL,
    "reservation_time" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_phone" TEXT NOT NULL,
    "guest_email" TEXT,
    "guest_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "special_requests" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dining_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dining_reservations_guest_id_idx" ON "dining_reservations"("guest_id");
CREATE INDEX "dining_reservations_status_date_idx" ON "dining_reservations"("status", "reservation_date");
