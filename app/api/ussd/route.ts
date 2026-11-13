// TODO: Africa's Talking USSD callback; verify AT_CALLBACK_SECRET, drive lib/ussd-menu.ts.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
