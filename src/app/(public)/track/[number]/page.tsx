import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { TrackForm } from "@/components/track/TrackForm";
import { TrackingGlobe } from "@/components/track/TrackingGlobe";
import { TrackingHeroCard } from "@/components/track/TrackingHeroCard";
import { TrackingProgressStepper } from "@/components/track/TrackingProgressStepper";
import { TrackingQuickActions } from "@/components/track/TrackingQuickActions";
import { TrackingRouteCard } from "@/components/track/TrackingRouteCard";
import { clientIp } from "@/server/client-ip";
import { rateLimit } from "@/server/rate-limit";
import { getPublicTracking } from "@/server/tracking";
import { ShieldCheck, Info } from "lucide-react";

export const metadata = { title: "Tracking" };

export default async function TrackingPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const ip = await clientIp();

  if (!rateLimit(`track:${ip}`, 60, 60_000)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Too many requests</h1>
        <p className="text-muted-foreground">Please wait a minute and try again.</p>
      </main>
    );
  }

  const t = await getPublicTracking(decodeURIComponent(number));
  if (!t) notFound();

  const latest = t.events.at(-1);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:py-12">
      {/* Search Input Bar */}
      <TrackForm defaultValue={t.trackingNumber} />

      {/* Hero Estimated Delivery & Status Headline (contains H1 matching status) */}
      <TrackingHeroCard
        trackingNumber={t.trackingNumber}
        status={t.status}
        serviceType={t.serviceType}
        transportMode={t.transportMode}
        departurePort={t.departurePort}
        arrivalPort={t.arrivalPort}
        departureDate={t.departureDate}
        estimatedArrival={t.estimatedArrival}
        latestLocation={latest?.location}
      />

      {/* 5-Stage Visual Progress Pipeline */}
      <TrackingProgressStepper currentStatus={t.status} events={t.events} />

      {/* Quick Actions & Manage Shipment Bar */}
      <TrackingQuickActions trackingNumber={t.trackingNumber} />

      {/* Main Grid: Left Route & Milestone Log, Right 3D Globe & Specs */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          {/* Detailed Route Card */}
          <TrackingRouteCard
            origin={t.origin}
            destination={t.destination}
            serviceType={t.serviceType}
            transportMode={t.transportMode}
            departurePort={t.departurePort}
            arrivalPort={t.arrivalPort}
          />

          {/* Milestone Checkpoint Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Milestone History & Checkpoints</CardTitle>
              <span className="font-mono text-xs text-muted-foreground">
                {t.events.length} update{t.events.length === 1 ? "" : "s"}
              </span>
            </CardHeader>
            <CardContent>
              <StatusTimeline events={t.events} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive 3D Flight & Transit Globe */}
        <div className="space-y-6">
          <TrackingGlobe tracking={t} />

          {/* Carrier Verified Guarantee Box */}
          <div className="rounded-xl border border-border bg-card/60 p-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>KingstonFreight Secure Custody Protocol</span>
            </div>
            <p className="mt-1.5 leading-relaxed">
              Consignments are scanned at every hub exchange with cryptographic chain-of-custody logging.
              For urgent questions or delivery amendments, contact our 24/7 port dispatch.
            </p>
            <div className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground border-t border-border/60 pt-2.5">
              <Info className="size-3.5 text-primary" />
              <span>Public tracking displays route city pairs for customer confidentiality.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
