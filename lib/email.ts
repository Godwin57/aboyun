import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

/**
 * Plain SMTP, for when there is no domain to verify with Resend. Gmail works with an app
 * password (Google account > Security > 2-Step Verification > App passwords). Used only
 * when SMTP_USER and SMTP_PASS are both set; it takes priority over Resend.
 */
export function smtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const user = env.SMTP_USER?.trim();
  // Google shows app passwords in groups of four letters; spaces are not part of it.
  const pass = env.SMTP_PASS?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  const port = Number(env.SMTP_PORT) || 465;
  return {
    host: env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    user,
    pass,
    // Gmail only sends as the signed-in address, so the sender is that address.
    from: env.SMTP_FROM?.trim() || `Aboyun <${user}>`,
  };
}

let transporter: Transporter | null = null;

function getTransporter(config: SmtpConfig) {
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 is implicit TLS; other ports (587) upgrade with STARTTLS.
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  return transporter;
}

/**
 * Send a transactional email: through SMTP if SMTP_USER and SMTP_PASS are set, otherwise
 * through Resend. With neither (local dev) the `text` is printed to the server console
 * instead, so one-time codes and invite links can be copied from the terminal.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const smtp = smtpConfig();
  if (smtp) {
    await getTransporter(smtp).sendMail({ from: smtp.from, ...opts });
    return;
  }

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
