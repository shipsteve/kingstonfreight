import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm mode="register" next={next} />
    </main>
  );
}
