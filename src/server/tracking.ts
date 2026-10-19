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
};

const STATIC_SHIPMENTS: Record<string, PublicTracking> = {
  "876-21252674": {
    trackingNumber: "876-21252674",
    serviceType: "PARCEL",
    status: "REROUTING",
    origin: { city: "New York", countryCode: "US", lat: 40.7128, lng: -74.006 },
    destination: { city: "Kingston", countryCode: "JM", lat: 17.9714, lng: -76.7936 },
    transportMode: "AIR",
    departurePort: "JFK",
    arrivalPort: "KIN",
    departureDate: new Date("2026-10-16T12:00:00Z"),
    estimatedArrival: new Date("2026-10-21T18:00:00Z"),
    estimatedDelivery: null,
    nextStop: "Kingston Central Sorting Hub (Hold for Reroute)",
    events: [
      {
        status: "BOOKED",
        location: "KingstonFreight Cargo Operations, New York, NY",
        countryCode: "US",
        note: "Consignment booking registered & air waybill generated.",
        createdAt: new Date("2026-10-15T09:30:00Z"),
        lat: 40.7128,
        lng: -74.006,
        confirmedAt: new Date("2026-10-15T09:30:00Z"),
      },
      {
        status: "PICKED_UP",
        location: "JFK International Air Cargo Facility, Queens, NY",
        countryCode: "US",
        note: "Screened and loaded into air freight container.",
        createdAt: new Date("2026-10-16T11:15:00Z"),
        lat: 40.6413,
        lng: -73.7781,
        confirmedAt: new Date("2026-10-16T11:15:00Z"),
      },
      {
        status: "IN_TRANSIT",
        location: "Departed JFK · Flight Linehaul Transit",
        countryCode: "US",
        note: "In transit on flight KF-204 to Norman Manley International Airport (KIN).",
        createdAt: new Date("2026-10-17T08:00:00Z"),
        lat: 28.5383,
        lng: -75.5,
        confirmedAt: new Date("2026-10-17T08:00:00Z"),
      },
      {
        status: "REROUTING",
        location: "Kingston Central Sorting & Distribution Hub",
        countryCode: "JM",
        note: "Consignment paused: Wrong destination address recorded. Item is currently held at the hub and being rerouted to the correct address. Please note: Rerouting is subject to an additional cost, which will be communicated once the item is ready to reroute.",
        createdAt: new Date("2026-10-18T14:20:00Z"),
        lat: 17.9714,
        lng: -76.7936,
        confirmedAt: new Date("2026-10-18T14:20:00Z"),
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
      };
    }
  } catch (err) {
    console.error("Database query error in getPublicTracking:", err);
  }

  return STATIC_SHIPMENTS[trackingNumber] ?? null;
}
