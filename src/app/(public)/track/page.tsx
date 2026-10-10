import { TrackForm } from "@/components/track/TrackForm";

export const metadata = { title: "Track a shipment" };

export default function TrackPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Track a shipment</h1>
      <p className="max-w-md text-muted-foreground">Enter the tracking number from your booking email.</p>
      <TrackForm />
    </main>
  );
}
