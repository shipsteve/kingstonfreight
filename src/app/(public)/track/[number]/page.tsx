import { notFound } from "next/navigation";
import { ScheduleLine } from "@/components/shipment/ScheduleLine";
import { StatusBadge } from "@/components/shipment/StatusBadge";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { TrackForm } from "@/components/track/TrackForm";
import { TrackingGlobe } from "@/components/track/TrackingGlobe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shortPlace } from "@/lib/address";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import { clientIp } from "@/server/client-ip";
import { rateLimit } from "@/server/rate-limit";
import { getPublicTracking } from "@/server/tracking";

export const metadata = { title: "Tracking" };

const SERVICE_LABEL = { PARCEL: "Parcel", COURIER: "Local courier", FREIGHT: "Freight" } as const;

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
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-12">
      <TrackForm defaultValue={t.trackingNumber} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div>
            <p className="font-mono text-sm text-muted-foreground">{t.trackingNumber}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{STATUS_LABELS[t.status]}</h1>
            {latest && <p className="mt-1 text-muted-foreground">Last seen: {latest.location}</p>}
            <ScheduleLine
              className="mt-3"
              departureDate={t.departureDate}
              estimatedArrival={t.estimatedArrival}
              transportMode={t.transportMode}
              departurePort={t.departurePort}
              arrivalPort={t.arrivalPort}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={t.status} />
              <span className="text-muted-foreground">{SERVICE_LABEL[t.serviceType]}</span>
            </div>
          </div>
          <Card>
            <CardContent className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">From</p>
                <p className="font-medium">{shortPlace(t.origin)}</p>
              </div>
              <span aria-hidden className="text-muted-foreground">
                →
              </span>
              <div className="text-right">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">To</p>
                <p className="font-medium">{shortPlace(t.destination)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline events={t.events} />
            </CardContent>
          </Card>
        </div>
        <TrackingGlobe tracking={t} />
      </div>
    </main>
  );
}
