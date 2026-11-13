// TODO: receive the client outbox and apply writes (RBAC-scoped).
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
