import { ClinicShell } from "@/components/clinic/clinic-shell";
import { requireRole } from "@/lib/auth";
import { getClinicShellInfo } from "@/lib/services/dashboard";

// CLINIC only. The sidebar and frame are shared by every clinic screen.
export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("CLINIC");
  const info = await getClinicShellInfo(session);
  return <ClinicShell {...info}>{children}</ClinicShell>;
}
