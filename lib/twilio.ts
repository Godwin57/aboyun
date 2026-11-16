// Twilio sender, used for outgoing SMS when its credentials are set (see lib/at.ts).
// No SDK: Twilio's REST API is one form-encoded POST with basic auth, which also keeps
// the bundle small. Trial accounts can only text numbers verified in the Twilio console.

export type TwilioConfig = { accountSid: string; authToken: string; from: string };

/** Read the three variables. Twilio is used only when all of them are set. */
export function twilioConfig(env: NodeJS.ProcessEnv = process.env): TwilioConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const from = env.TWILIO_FROM?.trim();
  return accountSid && authToken && from ? { accountSid, authToken, from } : null;
}

/** The request Twilio expects for one message. Pure, so it can be tested. */
export function buildTwilioRequest(config: TwilioConfig, to: string, message: string) {
  return {
    url: `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
    init: {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: config.from, Body: message }).toString(),
    },
  };
}

/** Send one SMS through Twilio. Throws with Twilio's own reason if it is refused. */
export async function sendTwilioSms(config: TwilioConfig, to: string, message: string) {
  const { url, init } = buildTwilioRequest(config, to, message);
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      code?: number;
    } | null;
    throw new Error(
      `Twilio ${response.status}${body?.code ? ` (${body.code})` : ""}: ${body?.message ?? "request failed"}`,
    );
  }
}
