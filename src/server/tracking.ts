import type { ServiceType, ShipmentStatus } from "@prisma/client";
import { asAddress } from "@/lib/address";
import { isTrackingNumber, normalizeTrackingNumber } from "@/lib/tracking/number";
import { db } from "./db";

export type PublicTracking = {
  trackingNumber: string;
  serviceType: ServiceType;
  status: ShipmentStatus;
  origin: { city: string; countryCode: string };
  destination: { city: string; countryCode: string };
  events: { status: ShipmentStatus; location: string; countryCode: string | null; note: string | null; createdAt: Date }[];
};

/** Public lookup: only city + country, never price or contact details. */
export async function getPublicTracking(raw: string): Promise<PublicTracking | null> {
  const trackingNumber = normalizeTrackingNumber(raw);
  if (!isTrackingNumber(trackingNumber)) return null;

  const s = await db.shipment.findUnique({
    where: { trackingNumber },
    select: {
      trackingNumber: true,
      serviceType: true,
      status: true,
      origin: true,
      destination: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: { status: true, location: true, countryCode: true, note: true, createdAt: true },
      },
    },
  });
  if (!s || s.status === "AWAITING_PAYMENT") return null;

  const place = (json: unknown) => {
    const a = asAddress(json);
    return { city: a.city, countryCode: a.countryCode };
  };
  return {
    trackingNumber: s.trackingNumber,
    serviceType: s.serviceType,
    status: s.status,
    origin: place(s.origin),
    destination: place(s.destination),
    events: s.events,
  };
}
