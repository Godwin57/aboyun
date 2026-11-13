import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";

// Loads the session once for every role area (the result is shared per request).
// Each role layout below still enforces its own role.
export default async function RolesLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
