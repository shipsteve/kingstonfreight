import { LogOut, Wallet } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";
import { formatMoney } from "@/lib/money";
import { getMyAccount } from "@/server/queries/customer";
import { getCurrentUser } from "@/server/session";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export async function Header() {
  const user = await getCurrentUser();
  const account = user?.role === "CUSTOMER" ? await getMyAccount() : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link href="/track" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Track
          </Link>
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Dashboard
              </Link>
              {account && (
                <Link
                  href="/account/wallet"
                  className={buttonVariants({ variant: "outline", size: "sm", className: "tabular-nums" })}
                  aria-label={`Wallet, balance ${formatMoney(account.balanceCents)}`}
                >
                  <Wallet /> {formatMoney(account.balanceCents)}
                </Link>
              )}
              <form action={logoutAction}>
                <Button variant="ghost" size="icon" type="submit" aria-label="Log out">
                  <LogOut />
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Log in
            </Link>
          )}
          <Link href="/quote" className={buttonVariants({ size: "sm", className: "ml-1 hidden sm:inline-flex" })}>
            Get a quote
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
