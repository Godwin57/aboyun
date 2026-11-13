import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Send a transactional email through Resend.
 * Without RESEND_API_KEY (local dev) the `text` is printed to the server console
 * instead, so one-time codes and invite links can be copied from the terminal.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(
      `\n[email:dev] To: ${opts.to}\n[email:dev] ${opts.subject}\n${opts.text}\n`,
    );
    return;
  }
  const { error } = await getClient().emails.send({
    from: process.env.EMAIL_FROM ?? "Aboyun <onboarding@resend.dev>",
    ...opts,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
