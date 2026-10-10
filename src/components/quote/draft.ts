import type { Address, PackageInput } from "@/lib/pricing/types";

export type ServiceType = "PARCEL" | "COURIER" | "FREIGHT";

export type QuoteDraft = {
  step: number;
  serviceType: ServiceType;
  origin: Address;
  destination: Address;
  packages: PackageInput[];
  distanceKm: number;
  freightDetails: { mode: "AIR" | "SEA" | "ROAD"; cargoType: string; description: string };
};

export const emptyAddress = (countryCode: string): Address => ({
  name: "",
  line1: "",
  city: "",
  postcode: "",
  countryCode,
});

export const emptyPackage = (): PackageInput => ({ weightKg: 1, lengthCm: 30, widthCm: 20, heightCm: 15, qty: 1 });

export function newDraft(homeCountry: string): QuoteDraft {
  return {
    step: 0,
    serviceType: "PARCEL",
    origin: emptyAddress(homeCountry),
    destination: emptyAddress(homeCountry),
    packages: [emptyPackage()],
    distanceKm: 10,
    freightDetails: { mode: "SEA", cargoType: "", description: "" },
  };
}

const KEY = "quote-draft";

export function saveDraft(draft: QuoteDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable: the draft just won't survive the login redirect
  }
}

export function takeDraft(): QuoteDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as QuoteDraft) : null;
  } catch {
    return null;
  }
}

/** The payload the server actions accept for this draft. */
export function toQuoteInput(d: QuoteDraft) {
  const { origin, destination } = d;
  if (d.serviceType === "COURIER") return { serviceType: "COURIER" as const, origin, destination, distanceKm: d.distanceKm };
  if (d.serviceType === "FREIGHT")
    return { serviceType: "FREIGHT" as const, origin, destination, packages: d.packages, freightDetails: d.freightDetails };
  return { serviceType: "PARCEL" as const, origin, destination, packages: d.packages };
}
