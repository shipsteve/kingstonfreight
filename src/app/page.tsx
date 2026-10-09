import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Temporary home until the landing page (globe, service cards) lands.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Shipping</h1>
      <p className="max-w-md text-muted-foreground">Quote, book and track parcels, local courier and freight.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/quote" className={buttonVariants()}>
          Get a quote
        </Link>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          My shipments
        </Link>
        <Link href="/admin" className={buttonVariants({ variant: "ghost" })}>
          Admin
        </Link>
      </div>
    </main>
  );
}
