import { ArrowRight, Box, Clock, FileCheck2, Globe2, MapPin, Plane, Ship, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GlowCard } from "@/components/cards/GlowCard";
import { TiltCard } from "@/components/cards/TiltCard";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { TrackForm } from "@/components/track/TrackForm";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/site";

const SERVICES = [
  {
    title: "Parcels",
    icon: Box,
    image: site.images.parcels,
    blurb: "Boxes up to 30 kg, at home and abroad. Send us the details and we'll price it for you.",
  },
  {
    title: "Local courier",
    icon: Truck,
    image: site.images.courier,
    blurb: "Same-day, door-to-door across town, priced by distance.",
  },
  {
    title: "Freight & cargo",
    icon: Ship,
    image: site.images.cargo,
    blurb: "Pallets and containers by air, sea or road. Our freight team prices it and you book in one click.",
  },
];

const AIR_FEATURES = [
  { icon: Plane, title: "International airport hubs", text: "Cargo moves through major international airports on scheduled freighters." },
  { icon: Clock, title: "Next flight out", text: "Urgent shipments ride the first available departure." },
  { icon: FileCheck2, title: "Customs handled", text: "Customs status shows up in your tracking timeline as it happens." },
];

const STEPS = [
  { icon: Box, title: "Request a quote", text: "Tell us what you're sending and where. Our team prices it, usually within one business day." },
  { icon: ShieldCheck, title: "Book", text: "Accept the price and pay from your prepaid account balance, funded with BTC or LTC." },
  { icon: MapPin, title: "Track", text: "Follow every scan from pickup to delivery, with email updates." },
];

const GALLERY = [site.images.warehouse, site.images.parcels, site.images.cargo, site.images.airport];

export default function Home() {
  return (
    <main className="flex-1 overflow-x-clip">
      {/* Hero */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Globe2 className="size-3.5 text-primary" /> Domestic &amp; international
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Ship anything, <span className="text-primary">anywhere</span>. Know where it is.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">{site.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/quote" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>
                Get a quote <ArrowRight />
              </Link>
              <Link href="/register" className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 px-5" })}>
                Create account
              </Link>
            </div>
            <div className="mt-10">
              <p className="mb-2 text-sm font-medium">Track a shipment</p>
              <TrackForm />
            </div>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Coverage strip */}
      <section aria-label="Coverage" className="border-y bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-sm text-muted-foreground">
          {["Domestic", "Europe", "Asia", "Worldwide", "Air", "Sea", "Road"].map((label) => (
            <span key={label} className="font-medium tracking-wide uppercase">
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <FadeIn className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">One place for every shipment</h2>
          <p className="mt-3 text-muted-foreground">From a single parcel to a full container.</p>
        </FadeIn>
        <Stagger className="grid gap-6 md:grid-cols-3">
          {SERVICES.map(({ title, icon: Icon, image, blurb }) => (
            <StaggerItem key={title}>
              <Link href="/quote" className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                <TiltCard className="h-full overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="relative aspect-[4/3]">
                    <Image src={image.src} alt={image.alt} fill unoptimized className="object-cover" />
                  </div>
                  <div className="space-y-2 p-6">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <Icon className="size-5 text-primary" /> {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{blurb}</p>
                    <p className="pt-2 text-sm font-medium text-primary">Request a quote →</p>
                  </div>
                </TiltCard>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Air delivery */}
      <section className="relative overflow-hidden bg-[oklch(0.17_0.035_262)] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-28 lg:grid-cols-2">
          <FadeIn>
            <div className="relative aspect-[3/2] overflow-hidden rounded-3xl ring-1 ring-white/10">
              <Image src={site.images.airport.src} alt={site.images.airport.alt} fill unoptimized className="object-cover" />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-sm font-medium tracking-wide text-brand-amber uppercase">Air delivery</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">From the runway to the doorstep</h2>
            <p className="mt-4 text-white/70">
              When it can&apos;t wait, it flies. We route time-critical freight through international airport cargo hubs and
              hand it to local couriers on landing.
            </p>
            <ul className="mt-8 space-y-5">
              {AIR_FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
                    <Icon className="size-5 text-brand-amber" />
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="text-sm text-white/65">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <FadeIn className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
        </FadeIn>
        <Stagger className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <StaggerItem key={title}>
              <GlowCard className="h-full">
                <div className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-4xl font-semibold text-muted-foreground/30 tabular-nums">0{i + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Operations gallery */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:pb-28">
        <FadeIn className="mb-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Our operations</h2>
          <p className="mt-2 text-muted-foreground">Warehouses, sorting lines, ports and airport cargo terminals.</p>
        </FadeIn>
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {GALLERY.map((img, i) => (
            <StaggerItem key={`${img.src}-${i}`} className={i === 0 ? "col-span-2 row-span-2" : ""}>
              <figure className="group relative h-full min-h-40 overflow-hidden rounded-2xl border">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white">
                  {img.alt}
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <FadeIn className="mx-auto max-w-4xl rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-xl shadow-primary/20">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to ship?</h2>
          <p className="mx-auto mt-2 max-w-md opacity-85">Request a quote today. We&apos;ll price it and email you, usually within one business day.</p>
          <Link href="/quote" className={buttonVariants({ size: "lg", variant: "secondary", className: "mt-6 h-11 px-6" })}>
            Get a quote <ArrowRight />
          </Link>
        </FadeIn>
      </section>
    </main>
  );
}
