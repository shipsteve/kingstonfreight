import { z } from "zod";
import { parseDateInput } from "./dates";
import { addressSchema, packageSchema } from "./quote-schema";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const port = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.toUpperCase() : undefined))
  .refine((v) => v === undefined || /^[A-Z]{3}$/.test(v), "Use a 3-letter airport/port code, e.g. JFK");

const day = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || parseDateInput(v) !== null, "Use a valid date")
  .transform((v) => parseDateInput(v));

export const adminOrderSchema = z
  .object({
    customerEmail: z.email("Enter the customer's email").transform((e) => e.toLowerCase()),
    sender: addressSchema,
    recipient: addressSchema,
    serviceType: z.enum(["PARCEL", "COURIER", "FREIGHT"]),
    transportMode: z.enum(["AIR", "SEA", "ROAD"]).optional(),
    departurePort: port,
    arrivalPort: port,
    departureDate: day,
    estimatedArrival: day,
    packages: z.array(packageSchema).min(1, "Add at least one piece").max(50),
    contents: z.string().trim().min(1, "Describe the contents").max(500),
    declaredValueCents: z.number().int().nonnegative(),
    goodsOriginCountry: z
      .string()
      .trim()
      .optional()
      .transform((c) => (c ? c.toUpperCase() : undefined))
      .refine((c) => c === undefined || /^[A-Z]{2}$/.test(c), "Use a 2-letter country code"),
    hsCode: optionalText(20),
    priceCents: z.number().int().positive("Price must be greater than zero"),
    billTo: z.enum(["SENDER", "RECIPIENT", "THIRD_PARTY"]),
    payment: z.enum(["BALANCE", "COUNTER"]),
  })
  .refine((o) => !o.departureDate || !o.estimatedArrival || o.estimatedArrival >= o.departureDate, {
    message: "Estimated arrival can't be before departure",
    path: ["estimatedArrival"],
  });

export type AdminOrderInput = z.input<typeof adminOrderSchema>;

export const scheduleSchema = z
  .object({ shipmentId: z.string().min(1), departureDate: day, estimatedArrival: day })
  .refine((o) => !o.departureDate || !o.estimatedArrival || o.estimatedArrival >= o.departureDate, {
    message: "Estimated arrival can't be before departure",
    path: ["estimatedArrival"],
  });
