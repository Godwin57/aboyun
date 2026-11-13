import AfricasTalking from "africastalking";

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
 * Without AT_API_KEY (local dev) the message is printed to the server console,
 * so one-time codes can be copied from the terminal.
 * TODO: wire Africa's Talking credentials and delivery reports.
 */
export async function sendSms(to: string | string[], message: string) {
  if (!process.env.AT_API_KEY) {
    console.log(`\n[sms:dev] To: ${String(to)}\n[sms:dev] ${message}\n`);
    return;
  }
  return getClient().SMS.send({ to: Array.isArray(to) ? to : [to], message });
}
