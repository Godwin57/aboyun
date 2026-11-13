# Aboyun

An offline-first, installable PWA that helps pregnant and nursing mothers in remote Nigeria spot danger early and reach care. Mothers on basic phones are served through USSD and SMS (Africa's Talking).

> Status: project foundation only. Folders, schema, auth, RBAC and PWA wiring are in place; features are marked with `TODO` comments.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS, ESLint), npm
- PostgreSQL (Neon or Supabase) + Prisma 7
- Better Auth (email OTP + phone number plugins, email + password for staff)
- shadcn/ui, Zod, React Hook Form, date-fns, lucide-react
- Offline: Serwist (service worker) + Dexie.js (IndexedDB)
- Resend (email), Africa's Talking (USSD + SMS)

## Roles

| Role           | Signs in with                  | Area      | Sees                                 |
| -------------- | ------------------------------ | --------- | ------------------------------------ |
| `MOTHER`       | email or phone + one-time code | `/mother` | Only her own record                  |
| `CLINIC`       | email + password               | `/clinic` | Mothers registered to their facility |
| `SYSTEM_ADMIN` | email + password               | `/admin`  | Everything                           |

Family members have no login. They are contacts (name, phone, email) on the mother's record.

Access is enforced twice: `proxy.ts` redirects by role, and every role `layout.tsx` re-checks the role on the server. Permissions and data scoping live in `lib/rbac.ts` (`can`, `requirePermission`, `scopeWhere`).

## Setup

You need Node 20+ and a Postgres database (a free Neon or Supabase project is fine).

```bash
git clone <repo-url>
cd aboyun
npm install
cp .env.example .env     # then fill in the values (see below)
npm run db:migrate       # creates the tables
npm run db:seed          # demo data
npm run dev
```

Open http://localhost:3000.

### Environment

See `.env.example`. At minimum set `DATABASE_URL`, `BETTER_AUTH_SECRET` (`npx auth@latest secret`) and `BETTER_AUTH_URL`. On Neon or Supabase, put the non-pooled connection string in `DIRECT_URL` for migrations. Without `RESEND_API_KEY` / `AT_API_KEY`, one-time codes are only logged to the server console.

### Seeded dev accounts

| Email                | Role           | Password                                           |
| -------------------- | -------------- | -------------------------------------------------- |
| `admin@aboyun.test`  | `SYSTEM_ADMIN` | `SEED_PASSWORD` env var, else see `prisma/seed.ts` |
| `clinic@aboyun.test` | `CLINIC`       | same                                               |

The demo mother has phone `+2348000000100`. These are dev-only credentials; never seed them into production.

## Scripts

| Script                            | What it does                        |
| --------------------------------- | ----------------------------------- |
| `npm run dev` / `build` / `start` | Next.js                             |
| `npm run lint` / `format`         | ESLint / Prettier                   |
| `npm run db:generate`             | Generate the Prisma client          |
| `npm run db:migrate`              | Create and apply a migration (dev)  |
| `npm run db:push`                 | Push the schema without a migration |
| `npm run db:studio`               | Open Prisma Studio                  |
| `npm run db:seed`                 | Seed demo data                      |

The Prisma client is generated into `lib/generated/prisma` (git-ignored) and regenerated on `npm install`.

## Folder structure

```
app/
  page.tsx                  landing: redirects by role
  (auth)/login/             sign-in
  (roles)/                  route group, no URL segment; layout loads the session
    mother/                 /mother
    clinic/                 /clinic, /clinic/mothers/[id], /clinic/emergencies
    admin/                  /admin
  api/                      auth, sync (push/pull), ussd, sms/inbound, cron/reminders
  serwist/[path]/route.ts   serves the service worker built from app/sw.ts
  manifest.ts, sw.ts        PWA manifest and service worker
lib/
  auth.ts, auth-client.ts   Better Auth (server / client) + session helpers
  db.ts                     Prisma client singleton
  rbac.ts                   permissions, can(), requirePermission(), scopeWhere()
  risk.ts, schedule.ts      risk scoring, visit schedule
  ussd-menu.ts              USSD menu
  services/                 emergency, reminders, notifications, audit
  at.ts, email.ts           Africa's Talking, Resend
  offline/                  Dexie schema and sync
prisma/                     schema.prisma, seed.ts
proxy.ts                    route guard (Next.js 16 name for middleware)
```

## Notes

- Better Auth requires an email on every user, so phone-only mothers get a placeholder address (`<digits>@phone.aboyun.invalid`).
- Placeholder icons live in `public/icons` (regenerate with `node scripts/generate-icons.mjs`); replace them with real artwork.
- The service worker is disabled in `npm run dev`. Test the PWA with `npm run build && npm run start`.

See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute.
