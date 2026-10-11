ALTER TABLE "TrackingEvent"
ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION,
ADD COLUMN "confirmedAt" TIMESTAMP(3);

ALTER TABLE "TrackingEvent" ADD CONSTRAINT "tracking_location_coordinates"
CHECK (("lat" IS NULL AND "lng" IS NULL) OR
       ("lat" IS NOT NULL AND "lng" IS NOT NULL AND "lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180));
