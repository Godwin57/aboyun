import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { getAppSession } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";

// Signed-in users go to their role home; signed-out visitors see the landing page.
export default async function Home() {
  const session = await getAppSession();
  if (session) redirect(roleHome(session.user.role));
  return <LandingPage />;
}
