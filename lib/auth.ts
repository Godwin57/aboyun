import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { sendInviteMessage } from "@/lib/invite-email";
import { sendSms } from "@/lib/at";
import { normalizeNgPhone } from "@/lib/phone";
import { roleHome, type AppSession } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

const OTP_TTL_SECONDS = 5 * 60; // codes live for 5 minutes and work once
const OTP_MAX_ATTEMPTS = 3;
const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // clinic invites live for 7 days
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // Sessions are random tokens stored in the database and sent in a signed,
  // HTTP-only, SameSite=Lax cookie (Secure in production).
  session: {
    expiresIn: SESSION_TTL_SECONDS,
    updateAge: 24 * 60 * 60, // slide the expiry at most once a day
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },

  // CLINIC and SYSTEM_ADMIN sign in with email + password. Nobody can sign up
  // publicly: the Aboyun team creates clinics, and each clinic gets an invite
  // email. The invite link is a Better Auth "reset password" token, so it is
  // single-use, expires, and creates the password the first time it is used.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: INVITE_TTL_SECONDS,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      // callbackURL on `url` sends the browser to /accept-invite?token=...
      await sendInviteMessage(user, url);
    },
    async onPasswordReset({ user }) {
      // Clicking the emailed link proves the address belongs to them.
      await db.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    },
  },

  user: {
    additionalFields: {
      // input: false means clients can never set these themselves.
      role: { type: "string", defaultValue: "MOTHER", input: false },
      facilityId: { type: "string", required: false, input: false },
      active: { type: "boolean", defaultValue: true, input: false },
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Deactivated users cannot start a session.
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { active: true },
          });
          if (!user?.active) return false;
        },
      },
    },
  },

  plugins: [
    // Lets mothers sign in with a phone number + password. Mothers are registered by
    // their clinic, so there is no signUpOnVerification (no public sign-up).
    // The OTP settings are only used for verifying a phone number later.
    phoneNumber({
      otpLength: 6,
      expiresIn: OTP_TTL_SECONDS,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      phoneNumberValidator: (phone) => normalizeNgPhone(phone) === phone,
      async sendOTP({ phoneNumber: to, code }) {
        // TODO: localise the SMS text per Mother.language.
        await sendSms(to, `Your Aboyun code is ${code}. It expires in 5 minutes.`);
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
