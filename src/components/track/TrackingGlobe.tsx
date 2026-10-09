import { countryName } from "@/lib/geo/countries";

/** Placeholder slot; Task 12 swaps in the 3D globe with the route arc and current-position marker. */
export function TrackingGlobe({
  originCountry,
  destinationCountry,
  currentCountry,
}: {
  originCountry: string;
  destinationCountry: string;
  currentCountry: string | null;
}) {
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-2xl border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      {countryName(originCountry)} → {countryName(destinationCountry)}
      {currentCountry && <> · now in {countryName(currentCountry)}</>}
    </div>
  );
}
