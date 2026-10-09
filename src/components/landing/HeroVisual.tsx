import Image from "next/image";
import { site } from "@/lib/site";

/** Static hero image; the 3D airport scene replaces this on capable devices and falls back to it otherwise. */
export function HeroVisual() {
  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl border shadow-2xl shadow-primary/10">
      <Image src={site.images.hero.src} alt={site.images.hero.alt} fill priority unoptimized className="object-cover" />
    </div>
  );
}
