"use client";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { SceneSlot } from "@/components/3d/SceneSlot";
import { countryCentroid } from "@/lib/geo/centroids";
import { countryName } from "@/lib/geo/countries";

const Globe = dynamic(() => import("@/components/3d/Globe"), { ssr: false });

const frame = "relative aspect-square w-full overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_50%_40%,#1b2f63,#0b1430)]";

export function TrackingGlobe({
  originCountry,
  destinationCountry,
  currentCountry,
}: {
  originCountry: string;
  destinationCountry: string;
  currentCountry: string | null;
}) {
  const from = countryCentroid(originCountry);
  const to = countryCentroid(destinationCountry);
  const marker = countryCentroid(currentCountry ?? originCountry) ?? undefined;

  const fallback = (
    <div className={`${frame} flex flex-col items-center justify-center gap-3 p-6 text-center text-white`}>
      <MapPin className="size-8 text-brand-amber" />
      <p className="text-lg font-medium">
        {countryName(originCountry)} → {countryName(destinationCountry)}
      </p>
      {currentCountry && <p className="text-sm text-white/70">Currently in {countryName(currentCountry)}</p>}
    </div>
  );

  if (!from || !to) return fallback;

  return (
    <SceneSlot
      fallback={fallback}
      render={(active) => (
        <div className={frame}>
          <Globe routes={[{ from, to }]} marker={marker} active={active} />
        </div>
      )}
    />
  );
}
