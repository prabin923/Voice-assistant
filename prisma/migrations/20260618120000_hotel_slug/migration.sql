-- Tenant slug for multi-hotel embed URLs
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "hotels_slug_key" ON "hotels"("slug");
