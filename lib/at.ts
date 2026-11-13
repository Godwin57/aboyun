import AfricasTalking from "africastalking";

// TODO: Africa's Talking client for SMS (and USSD helpers). Created lazily so the
// build does not need credentials.
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

/** Send an SMS to one or more numbers (international format, e.g. +234...). */
export async function sendSms(to: string | string[], message: string) {
  if (!process.env.AT_API_KEY) {
    console.warn(`[sms] AT_API_KEY not set. Would send to ${String(to)}: ${message}`);
    return;
  }
  return getClient().SMS.send({ to: Array.isArray(to) ? to : [to], message });
}
