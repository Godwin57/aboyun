import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/services/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Daily job (see vercel.json): send the visit reminders that are due. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json(await sendDueReminders());
  } catch (error) {
    console.error("Reminder cron failed", error);
    return NextResponse.json({ error: "Reminder run failed." }, { status: 500 });
  }
}
