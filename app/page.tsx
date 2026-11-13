import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";

// Landing: signed-in users go to their role home, everyone else to /login.
export default async function Home() {
  const session = await getAppSession();
  redirect(session ? roleHome(session.user.role) : "/login");
}
