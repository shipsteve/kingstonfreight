import type { BillTo, PaymentMethod, PaymentStatus, ServiceType, TransportMode } from "@prisma/client";
import { asAddress } from "@/lib/address";
import type { Address, PackageInput } from "@/lib/pricing/types";
import { db } from "../db";
import { getCurrentUser, requireAdmin } from "../session";

export type ReceiptData = {
  trackingNumber: string;
  issuedAt: Date;
  issuedBy: string;
  serviceType: ServiceType;
  transportMode: TransportMode | null;
  departurePort: string | null;
  arrivalPort: string | null;
  departureDate: Date | null;
  estimatedArrival: Date | null;
  sender: Address;
  recipient: Address;
  pieces: PackageInput[];
  actualWeightKg: number | null;
  chargeableWeightKg: number | null;
  contents: string | null;
  declaredValueCents: number | null;
  goodsOriginCountry: string | null;
  hsCode: string | null;
  priceCents: number;
  billTo: BillTo | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
};

async function load(where: { id: string; userId?: string }): Promise<ReceiptData | null> {
  const s = await db.shipment.findFirst({ where });
  if (!s) return null;
  const creator = s.createdById
    ? await db.user.findUnique({ where: { id: s.createdById }, select: { email: true } })
    : null;
  return {
    trackingNumber: s.trackingNumber,
    issuedAt: s.createdAt,
    issuedBy: creator?.email ?? "Online booking",
    serviceType: s.serviceType,
    transportMode: s.transportMode,
    departurePort: s.departurePort,
    arrivalPort: s.arrivalPort,
    departureDate: s.departureDate,
    estimatedArrival: s.estimatedArrival,
    sender: asAddress(s.origin),
    recipient: asAddress(s.destination),
    pieces: (s.packages as PackageInput[] | null) ?? [],
    actualWeightKg: s.actualWeightKg,
    chargeableWeightKg: s.chargeableWeightKg,
    contents: s.contents,
    declaredValueCents: s.declaredValueCents,
    goodsOriginCountry: s.goodsOriginCountry,
    hsCode: s.hsCode,
    priceCents: s.priceCents,
    billTo: s.billTo,
    paymentMethod: s.paymentMethod,
    paymentStatus: s.paymentStatus,
  };
}

export async function getReceiptForAdmin(id: string): Promise<ReceiptData | null> {
  await requireAdmin();
  return load({ id });
}

export async function getReceiptForOwner(id: string): Promise<ReceiptData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return load({ id, userId: user.id });
}
