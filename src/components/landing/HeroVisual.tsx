"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { SceneSlot } from "@/components/3d/SceneSlot";
import { site } from "@/lib/site";

const AirportScene = dynamic(() => import("@/components/3d/AirportScene"), { ssr: false });

const frame = "relative aspect-[3/2] w-full overflow-hidden rounded-3xl border shadow-2xl shadow-primary/10";

function StaticHero() {
  return (
    <div className={frame}>
      <Image src={site.images.hero.src} alt={site.images.hero.alt} fill priority unoptimized className="object-cover" />
    </div>
  );
}

/** 3D airport (runway, cargo plane, terminal, containers, parcels) on capable devices; illustration otherwise. */
export function HeroVisual() {
  return (
    <SceneSlot
      fallback={<StaticHero />}
      render={(active) => (
        <div className={`${frame} bg-[#101c3a]`}>
          <AirportScene active={active} />
        </div>
      )}
    />
  );
}
