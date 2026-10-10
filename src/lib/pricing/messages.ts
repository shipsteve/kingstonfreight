import type { PriceFailReason } from "./types";

export const PRICE_FAIL_MESSAGES: Record<PriceFailReason, string> = {
  NO_ORIGIN_ZONE: "We don't pick up from that address yet. Request a freight quote and we'll price it for you.",
  NO_DEST_ZONE: "We don't deliver to that address yet. Request a freight quote and we'll price it for you.",
  NO_RATE: "We don't have a parcel rate for that route. Request a freight quote instead.",
  TOO_HEAVY: "That's too heavy for parcel service. Request a freight quote instead.",
  NOT_DOMESTIC: "Local courier only runs within our home country. Try parcel or freight instead.",
  TOO_FAR: "That's beyond our local courier range. Try parcel or freight instead.",
};
