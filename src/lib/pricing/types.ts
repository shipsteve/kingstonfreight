export type Address = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  countryCode: string;
  phone?: string;
};

export type PackageInput = { weightKg: number; lengthCm: number; widthCm: number; heightCm: number; qty: number };

export type ZoneDef = {
  id: string;
  kind: "DOMESTIC" | "INTERNATIONAL";
  postcodePrefixes: string[];
  countryCodes: string[];
};

export type ParcelRateDef = { originZoneId: string; destZoneId: string; maxWeightKg: number; priceCents: number };

export type CourierRateDef = { baseFeeCents: number; perKmCents: number; maxKm: number };

export type PriceFailReason = "NO_ORIGIN_ZONE" | "NO_DEST_ZONE" | "NO_RATE" | "TOO_HEAVY" | "NOT_DOMESTIC" | "TOO_FAR";

export type PriceResult = { ok: true; priceCents: number; billableKg?: number } | { ok: false; reason: PriceFailReason };
