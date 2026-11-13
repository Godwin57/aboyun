import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireRole } from "@/lib/auth";

// CLINIC only.
export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CLINIC");
  return (
    <div className="flex min-h-screen flex-col">
      {/* TODO: clinic navigation (dashboard, mothers, emergencies, reports, sign out) */}
      <nav className="flex items-center gap-4 border-b p-4">
        <Link href="/clinic">Dashboard</Link>
        <Link href="/clinic/emergencies">Emergencies</Link>
        <SignOutButton className="ml-auto" />
      </nav>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}
