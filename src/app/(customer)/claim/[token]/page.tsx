import { ClaimButton } from "@/components/claim/ClaimButton";
import { getCurrentUser } from "@/server/session";

export const metadata = { title: "Add shipment to your account" };

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, user] = await Promise.all([params, getCurrentUser()]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Add this shipment to your account</h1>
      <p className="max-w-md text-muted-foreground">
        You&apos;re signed in as <span className="font-medium text-foreground">{user?.email}</span>. The shipment will
        appear in your dashboard with its receipt and tracking history.
      </p>
      <ClaimButton token={token} />
    </main>
  );
}
