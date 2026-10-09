import { TrackForm } from "@/components/track/TrackForm";

export default function TrackingNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that shipment</h1>
      <p className="max-w-md text-muted-foreground">
        Check the tracking number in your booking email. It looks like SHP- followed by 10 letters and numbers.
      </p>
      <TrackForm />
    </main>
  );
}
