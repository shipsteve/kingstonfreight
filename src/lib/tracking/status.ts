import type { ShipmentStatus } from "@prisma/client";

export const TERMINAL_STATUSES: ShipmentStatus[] = ["DELIVERED", "CANCELLED"];

export const ADMIN_SETTABLE_STATUSES: ShipmentStatus[] = [
  "BOOKED",
  "PICKED_UP",
  "IN_TRANSIT",
  "CUSTOMS",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
];

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to || to === "AWAITING_PAYMENT") return false;
  if (TERMINAL_STATUSES.includes(from)) return false;
  if (from === "AWAITING_PAYMENT") return to === "BOOKED" || to === "CANCELLED";
  return true;
}
