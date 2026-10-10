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
  if (from === to) return false;
  return !TERMINAL_STATUSES.includes(from);
}
