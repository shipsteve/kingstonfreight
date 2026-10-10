import { z } from "zod";

const text = (max: number) => z.string().trim().min(1, "Required").max(max);

export const addressSchema = z.object({
  name: text(100),
  line1: text(200),
  line2: z.string().trim().max(200).optional(),
  city: text(100),
  postcode: text(20),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Use a 2-letter country code")
    .transform((c) => c.toUpperCase()),
  phone: z.string().trim().max(40).optional(),
  email: z
    .union([z.literal(""), z.email("Enter a valid email")])
    .optional()
    .transform((e) => (e ? e.toLowerCase() : undefined)),
});

export const packageSchema = z.object({
  weightKg: z.number().positive().max(100_000),
  lengthCm: z.number().positive().max(10_000),
  widthCm: z.number().positive().max(10_000),
  heightCm: z.number().positive().max(10_000),
  qty: z.number().int().min(1).max(1000),
});

const packages = z.array(packageSchema).min(1, "Add at least one package").max(20, "At most 20 package lines");

export const freightDetailsSchema = z.object({
  mode: z.enum(["AIR", "SEA", "ROAD"]),
  cargoType: text(100),
  description: text(2000),
});

export const quoteInputSchema = z.discriminatedUnion("serviceType", [
  z.object({ serviceType: z.literal("PARCEL"), origin: addressSchema, destination: addressSchema, packages }),
  z.object({
    serviceType: z.literal("COURIER"),
    origin: addressSchema,
    destination: addressSchema,
    distanceKm: z.number().positive().max(10_000),
  }),
  z.object({
    serviceType: z.literal("FREIGHT"),
    origin: addressSchema,
    destination: addressSchema,
    packages,
    freightDetails: freightDetailsSchema,
  }),
]);

export type QuoteInput = z.input<typeof quoteInputSchema>;
export type ParsedQuoteInput = z.output<typeof quoteInputSchema>;
