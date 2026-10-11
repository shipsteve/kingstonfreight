// Airport reference points, not shipment scans.
// KIN: https://www.aeropuertosgap.com.mx/en/kingston/4318-kingston-en.html
// JFK: https://www.faa.gov/air_traffic/publications/atpubs/aip_html/part3_ad_2.0_new_york.html
// SAV: https://nfdc.faa.gov/webContent/nfdd/nfdd-2024-07-18-138.pdf
const AIRPORTS: Record<string, { name: string; lat: number; lng: number }> = {
  KIN: { name: "Norman Manley International Airport", lat: 17 + 56 / 60 + 8 / 3600, lng: -(76 + 47 / 60 + 15 / 3600) },
  JFK: { name: "John F. Kennedy International Airport", lat: 40 + 38 / 60 + 23.741 / 3600, lng: -(73 + 46 / 60 + 43.292 / 3600) },
  SAV: { name: "Savannah/Hilton Head International Airport", lat: 32 + 7 / 60 + 39.3 / 3600, lng: -(81 + 12 / 60 + 7.7 / 3600) },
};

export function plannedAirportStops(shipment: {
  transportMode?: string | null; departurePort?: string | null; arrivalPort?: string | null; nextStop?: string | null;
}) {
  if (shipment.transportMode !== "AIR") return [];
  const codes = [...new Set([shipment.departurePort, shipment.arrivalPort].filter((code): code is string => !!code))];
  const stops = codes.flatMap((code) => AIRPORTS[code.toUpperCase()] ? [{ code: code.toUpperCase(), ...AIRPORTS[code.toUpperCase()] }] : []);
  const next = shipment.nextStop?.toLowerCase();
  const index = next ? stops.findIndex((stop) => next.includes(stop.code.toLowerCase()) || next.includes(stop.name.toLowerCase())) : -1;
  return index > 0 ? stops.slice(index) : stops;
}
