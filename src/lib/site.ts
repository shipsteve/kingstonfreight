// Branding and imagery in one place. Replace the illustrations in public/images with your own photos
// (same names, or update the paths here) — e.g. a real shot of your warehouse, trucks, or airport hub.
export const site = {
  name: process.env.COMPANY_NAME || "ShipCo",
  tagline: "Parcels, local courier and freight — quoted in seconds, tracked to the door.",
  images: {
    hero: { src: "/images/airport.svg", alt: "Cargo plane taking off from an international airport runway at dusk" },
    parcels: { src: "/images/parcels.svg", alt: "Stacked parcels on a sorting conveyor" },
    courier: { src: "/images/courier.svg", alt: "Delivery van driving past city buildings" },
    cargo: { src: "/images/cargo.svg", alt: "Shipping containers stacked at a port with a crane and cargo ship" },
    airport: { src: "/images/airport.svg", alt: "International airport with runway lights, terminal and control tower" },
    warehouse: { src: "/images/warehouse.svg", alt: "Warehouse with loading docks and trucks" },
  },
} as const;
