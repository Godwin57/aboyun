import { requireRole } from "@/lib/auth";

// SYSTEM_ADMIN only.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("SYSTEM_ADMIN");
  return <div className="min-h-screen p-4">{children}</div>;
}
