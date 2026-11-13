import Link from "next/link";
import { Wordmark } from "@/components/auth/auth-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireRole } from "@/lib/auth";

// SYSTEM_ADMIN only.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("SYSTEM_ADMIN");
  return (
    <div className="min-h-screen">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-6">
            <Wordmark />
            <nav className="hidden gap-4 text-sm font-medium sm:flex">
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                Clinics
              </Link>
              {/* TODO: users, audit log */}
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">{children}</div>
    </div>
  );
}
