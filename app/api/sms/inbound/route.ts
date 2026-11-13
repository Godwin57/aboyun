// TODO: Africa's Talking inbound SMS callback; verify AT_CALLBACK_SECRET.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
