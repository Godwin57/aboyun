import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, phoneNumber } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/at";
import { roleHome, type AppSession } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // CLINIC and SYSTEM_ADMIN sign in with email + password. Their accounts are
  // created by us (seed / admin screens), never by public sign-up.
  emailAndPassword: { enabled: true, disableSignUp: true },

  user: {
    additionalFields: {
      // input: false means clients can never set these themselves.
      role: { type: "string", defaultValue: "MOTHER", input: false },
      facilityId: { type: "string", required: false, input: false },
      active: { type: "boolean", defaultValue: true, input: false },
    },
  },

  plugins: [
    // MOTHER: one-time code by email...
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        // TODO: proper email template; handle the "forget-password" / "email-verification" types.
        await sendEmail({
          to: email,
          subject: "Your Aboyun sign-in code",
          html: `<p>Your code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
        });
      },
    }),
    // ...or by SMS to her phone number.
    phoneNumber({
      async sendOTP({ phoneNumber: to, code }) {
        // TODO: localise the SMS text per Mother.language.
        await sendSms(to, `Your Aboyun code is ${code}`);
      },
      signUpOnVerification: {
        // Better Auth requires an email on every user; phone-only mothers get a placeholder.
        getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@phone.aboyun.invalid`,
        getTempName: (phone) => phone,
      },
    }),
    nextCookies(), // keep last
  ],
});

/**
 * The signed-in user plus RBAC context (role, facility, linked Mother id), or null.
 * Wrapped in React `cache` so every layout/page in one request shares a single lookup.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const user = session.user as typeof session.user & {
    role?: Role;
    facilityId?: string | null;
    active?: boolean;
  };
  if (user.active === false) return null;

  const role: Role = user.role ?? "MOTHER";
  let motherId: string | null = null;
  if (role === "MOTHER") {
    const mother = await db.mother.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    motherId = mother?.id ?? null;
  }

  return { user: { id: user.id, role, facilityId: user.facilityId ?? null, motherId } };
});

/** Server-side role gate for layouts/pages. Redirects instead of rendering. */
export async function requireRole(role: Role): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (session.user.role !== role) redirect(roleHome(session.user.role));
  return session;
}
