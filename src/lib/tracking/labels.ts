import type { ShipmentStatus } from "@prisma/client";

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  BOOKED: "Booked",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  CUSTOMS: "In customs",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  EXCEPTION: "Delivery exception",
  CANCELLED: "Cancelled",
  REROUTING: "Rerouting",
};
