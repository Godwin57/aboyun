// TODO: return records changed since a cursor (RBAC-scoped).
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
