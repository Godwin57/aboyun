import { timingSafeEqual } from "node:crypto";

/**
 * Africa's Talking webhooks are not signed in users, so the callback URLs we give it carry
 * a secret: https://your-app/api/ussd?secret=<AT_CALLBACK_SECRET>. This checks it in
 * constant time.
 *
 * "unconfigured" means no secret is set on the server: refuse, never run open.
 */
export function checkCallbackSecret(
  request: Request,
): "ok" | "forbidden" | "unconfigured" {
  const expected = process.env.AT_CALLBACK_SECRET;
  if (!expected) return "unconfigured";

  const given = new URL(request.url).searchParams.get("secret") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // timingSafeEqual needs equal lengths; a different length is simply a mismatch.
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "forbidden";
}

/** Plain-text reply, which is what Africa's Talking expects from a USSD callback. */
export function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
