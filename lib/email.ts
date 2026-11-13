import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/** Send a transactional email through Resend. */
export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    // TODO: remove this dev fallback once RESEND_API_KEY is configured everywhere.
    console.warn(
      `[email] RESEND_API_KEY not set. Would send "${opts.subject}" to ${opts.to}`,
    );
    return;
  }
  const { error } = await getClient().emails.send({
    from: process.env.EMAIL_FROM ?? "Aboyun <onboarding@resend.dev>",
    ...opts,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
