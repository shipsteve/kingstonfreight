import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getCurrentUser } from "@/server/session";

export const metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminNav />
      <div className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</div>
    </div>
  );
}
