import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";
import { ForbiddenError } from "@/lib/rbac";
import { ServiceError } from "@/lib/services/errors";
import { getHomeData } from "@/lib/services/mother-app";

export const dynamic = "force-dynamic";

/** GET ?since=<cursor>: only her own records changed after the cursor, plus a new cursor. */
export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const raw = new URL(request.url).searchParams.get("since");
  let since: Date | undefined;
  if (raw) {
    since = new Date(raw);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
  }

  try {
    return NextResponse.json(await getHomeData(session, since), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof ServiceError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Sync pull failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
