import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth";
import { pushBodySchema, syncOpSchema, type PushResult } from "@/lib/offline/protocol";
import { ForbiddenError } from "@/lib/rbac";
import { ServiceError } from "@/lib/services/errors";
import { applySyncOp } from "@/lib/services/mother-app";

export const dynamic = "force-dynamic";

/** Receive the phone's outbox. Each operation is applied on its own and idempotently. */
export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.user.role !== "MOTHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = pushBodySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const results: PushResult[] = [];
  for (const raw of parsed.data.ops) {
    const op = syncOpSchema.safeParse(raw);
    if (!op.success) {
      const id =
        typeof raw === "object" && raw !== null && "id" in raw ? String(raw.id) : "";
      results.push({ id, status: "invalid", error: "Invalid operation" });
      continue;
    }
    try {
      await applySyncOp(session, op.data);
      results.push({ id: op.data.id, status: "ok" });
    } catch (error) {
      if (error instanceof ServiceError || error instanceof ForbiddenError) {
        results.push({ id: op.data.id, status: "invalid", error: error.message });
      } else {
        console.error("Sync push failed", error);
        results.push({ id: op.data.id, status: "retry", error: "Server error" });
      }
    }
  }
  return NextResponse.json({ results });
}
