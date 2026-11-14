import { MotherShell } from "@/components/mother/mother-shell";
import { requireRole } from "@/lib/auth";

// MOTHER only.
export default async function MotherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("MOTHER");
  return <MotherShell userId={session.user.id}>{children}</MotherShell>;
}
