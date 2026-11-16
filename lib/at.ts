import AfricasTalking from "africastalking";
import { sendTwilioSms, twilioConfig } from "@/lib/twilio";

// Africa's Talking client, created lazily so the build does not need credentials.
let client: ReturnType<typeof AfricasTalking> | null = null;

function getClient() {
  if (!client) {
    client = AfricasTalking({
      username: process.env.AT_USERNAME ?? "sandbox",
      apiKey: process.env.AT_API_KEY ?? "",
    });
  }
  return client;
}

/**
 * Send an SMS (international format, e.g. +234...).
 * If TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are all set, Twilio is tried
 * first (useful for demos, because the Africa's Talking sandbox only reaches its
 * simulator). A number Twilio refuses, such as an unverified one on a trial account, falls
 * back to Africa's Talking. USSD and incoming SMS always stay on Africa's Talking.
 * Without AT_API_KEY (local dev) the message is printed to the server console,
 * so one-time codes can be copied from the terminal.
 */
export async function sendSms(to: string | string[], message: string) {
  const recipients = Array.isArray(to) ? to : [to];

  let remaining = recipients;
  const twilio = twilioConfig();
  if (twilio) {
    const results = await Promise.allSettled(
      recipients.map((r) => sendTwilioSms(twilio, r, message)),
    );
    remaining = recipients.filter((_, i) => {
      const result = results[i];
      if (result.status === "rejected") {
        console.error(
          `Twilio SMS to ${recipients[i]} failed, trying Africa's Talking`,
          result.reason,
        );
        return true;
      }
      return false;
    });
    if (remaining.length === 0) return;
  }

  if (!process.env.AT_API_KEY) {
    console.log(`\n[sms:dev] To: ${remaining.join(", ")}\n[sms:dev] ${message}\n`);
    return;
  }
  return getClient().SMS.send({ to: remaining, message });
}
