import { QuoteStepper } from "@/components/quote/QuoteStepper";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/server/session";

export const metadata = { title: "Get a quote" };

export default async function QuotePage() {
  const user = await getCurrentUser();
  return (
    <main className="flex-1 px-4 py-12 sm:py-16">
      <div className="mx-auto mb-10 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get a quote</h1>
        <p className="mt-2 text-muted-foreground">Instant prices for parcels and local courier. Freight is priced by our team.</p>
      </div>
      <QuoteStepper homeCountry={config.homeCountry} loggedIn={!!user} />
    </main>
  );
}
