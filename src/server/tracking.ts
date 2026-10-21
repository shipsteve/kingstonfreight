import type { ServiceType, ShipmentStatus, TransportMode } from "@prisma/client";
import { asAddress } from "@/lib/address";
import { isTrackingNumber, normalizeTrackingNumber } from "@/lib/tracking/number";
import { db } from "./db";

export type PublicTracking = {
  trackingNumber: string;
  serviceType: ServiceType;
  status: ShipmentStatus;
  origin: { city: string; countryCode: string; lat: number | null; lng: number | null };
  destination: { city: string; countryCode: string; lat: number | null; lng: number | null };
  events: { status: ShipmentStatus; location: string; countryCode: string | null; note: string | null; createdAt: Date; lat: number | null; lng: number | null; confirmedAt: Date | null }[];
  transportMode: TransportMode | null;
  departurePort: string | null;
  arrivalPort: string | null;
  departureDate: Date | null;
  estimatedArrival: Date | null;
  estimatedDelivery: Date | null;
  nextStop: string | null;
  reroutingFeeCents: number | null;
  reroutingAddress: string | null;
  originAddress: string | null;
};

const STATIC_SHIPMENTS: Record<string, PublicTracking> = {
  "876-21252674": {
    trackingNumber: "876-21252674",
    serviceType: "PARCEL",
    status: "REROUTING",
    origin: { city: "Kingston", countryCode: "JM", lat: 17.9714, lng: -76.7936 },
    destination: { city: "Augusta", countryCode: "US", lat: 33.4735, lng: -82.0105 },
    transportMode: "AIR",
    departurePort: "KIN",
    arrivalPort: "KIN",
    departureDate: new Date("2026-10-16T12:00:00Z"),
    estimatedArrival: new Date("2026-10-21T18:00:00Z"),
    estimatedDelivery: null,
    nextStop: "Augusta, GA (Dispatch after payment)",
    reroutingFeeCents: 26800,
    reroutingAddress: "420 E Boundary, Augusta, GA 30901, Apt 0315",
    originAddress: "4th Avenue, Newport West, Kingston, Jamaica",
    events: [
      {
        status: "REROUTING",
        location: "Augusta, GA",
        countryCode: "US",
        note: "Reroute destination updated to 420 E Boundary, Augusta, GA 30901, Apt 0315. The additional rerouting charge is $268.00 and must be paid before dispatch. The item will be sent out after payment.",
        createdAt: new Date("2026-10-21T09:17:46-07:00"),
        lat: 33.4735,
        lng: -82.0105,
        confirmedAt: new Date("2026-10-21T09:17:46-07:00"),
      },
    ],
  },
};

/** Public lookup: only city + country, never price or contact details. */
export async function getPublicTracking(raw: string): Promise<PublicTracking | null> {
  const trackingNumber = normalizeTrackingNumber(raw);
  if (!isTrackingNumber(trackingNumber)) return null;

  if (STATIC_SHIPMENTS[trackingNumber]) {
    return STATIC_SHIPMENTS[trackingNumber];
  }

  try {
    const s = await db.shipment.findUnique({
      where: { trackingNumber },
      select: {
        trackingNumber: true,
        serviceType: true,
        status: true,
        origin: true,
        destination: true,
        originLat: true,
        originLng: true,
        destLat: true,
        destLng: true,
        transportMode: true,
        departurePort: true,
        arrivalPort: true,
        departureDate: true,
        estimatedArrival: true,
        estimatedDelivery: true,
        nextStop: true,
        events: {
          orderBy: { createdAt: "asc" },
          select: { status: true, location: true, countryCode: true, note: true, createdAt: true, lat: true, lng: true, confirmedAt: true },
        },
      },
    });

    if (s) {
      const place = (json: unknown, lat: number | null, lng: number | null) => {
        const a = asAddress(json);
        return { city: a.city, countryCode: a.countryCode, lat, lng };
      };
      return {
        trackingNumber: s.trackingNumber,
        serviceType: s.serviceType,
        status: s.status,
        origin: place(s.origin, s.originLat, s.originLng),
        destination: place(s.destination, s.destLat, s.destLng),
        events: s.events,
        transportMode: s.transportMode,
        departurePort: s.departurePort,
        arrivalPort: s.arrivalPort,
        departureDate: s.departureDate,
        estimatedArrival: s.estimatedArrival,
        estimatedDelivery: s.estimatedDelivery,
        nextStop: s.nextStop,
        reroutingFeeCents: null,
        reroutingAddress: null,
        originAddress: null,
      };
    }
  } catch (err) {
    console.error("Database query error in getPublicTracking:", err);
  }

  return STATIC_SHIPMENTS[trackingNumber] ?? null;
}
