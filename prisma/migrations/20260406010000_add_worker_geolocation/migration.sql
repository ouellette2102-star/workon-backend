-- Add geolocation to LocalUser for Map/Swipe discovery
ALTER TABLE "local_users" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "local_users" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Spatial index for geo queries
CREATE INDEX "local_users_latitude_longitude_idx" ON "local_users"("latitude", "longitude");
