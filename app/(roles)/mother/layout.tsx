import Link from "next/link";
import { requireRole } from "@/lib/auth";

// MOTHER only.
export default async function MotherLayout({ children }: { children: React.ReactNode }) {
  await requireRole("MOTHER");
  return (
    <div className="flex min-h-screen flex-col">
      {/* TODO: mother navigation (home, symptoms, visits, reminders, emergency, sign out) */}
      <nav className="flex gap-4 border-b p-4">
        <Link href="/mother">Home</Link>
      </nav>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}
