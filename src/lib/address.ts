import { countryName } from "./geo/countries";
import type { Address } from "./pricing/types";

/** Addresses are stored as Prisma Json; this narrows them back. */
export function asAddress(json: unknown): Address {
  return json as Address;
}

export function shortPlace(a: { city: string; countryCode: string }): string {
  return `${a.city}, ${countryName(a.countryCode)}`;
}
