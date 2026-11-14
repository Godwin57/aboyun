import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../lib/generated/prisma/client";
import { placeholderEmailFor } from "../lib/phone";
import { assessVisit, overallRisk, type DangerSign } from "../lib/risk";
import { ancSchedule, eddFromLmp, startOfUtcDay } from "../lib/schedule";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15_000, // Neon can be waking from scale-to-zero
  }),
});

// Dev-only credentials for the seeded staff accounts. Never use these in production.
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe123!";

/** Create a user (if missing) with a ready-made password, skipping the invite email. */
async function upsertStaff(opts: {
  email: string;
  name: string;
  role: "SYSTEM_ADMIN" | "CLINIC" | "MOTHER";
  facilityId?: string;
  phoneNumber?: string;
}) {
  const user = await db.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      email: opts.email,
      name: opts.name,
      role: opts.role,
      facilityId: opts.facilityId,
      phoneNumber: opts.phoneNumber,
      phoneNumberVerified: !!opts.phoneNumber,
      emailVerified: true,
    },
  });
  const existing = await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!existing) {
    await db.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: await hashPassword(SEED_PASSWORD),
      },
    });
  }
  return user;
}

const DAY_MS = 86_400_000;

type Reading = {
  bp: [number, number];
  weight: number;
  hb: number;
  signs?: Partial<Record<DangerSign, boolean>>;
};

/**
 * Create a demo mother (if she isn't there yet) with her eight antenatal visits. The first
 * `readings.length` contacts are marked attended on their due date, with those readings;
 * risk flags are raised by the same rules the app uses.
 */
async function seedMother(opts: {
  facilityId: string;
  name: string;
  phone: string;
  language: string;
  weeks: number;
  family: { name: string; phone: string; relation: string };
  readings: Reading[];
  userId?: string;
}) {
  let mother = await db.mother.findFirst({ where: { phone: opts.phone } });
  if (!mother) {
    const lmp = new Date(startOfUtcDay(new Date()).getTime() - opts.weeks * 7 * DAY_MS);
    const userId =
      opts.userId ??
      (
        await db.user.create({
          data: {
            name: opts.name,
            email: placeholderEmailFor(opts.phone),
            phoneNumber: opts.phone,
            role: "MOTHER",
          },
        })
      ).id;
    mother = await db.mother.create({
      data: {
        userId,
        name: opts.name,
        phone: opts.phone,
        language: opts.language,
        lmp,
        edd: eddFromLmp(lmp),
        facilityId: opts.facilityId,
        consentAt: new Date(),
        familyContacts: { create: opts.family },
      },
    });
  }
  if ((await db.visit.count({ where: { motherId: mother.id } })) > 0) return mother;

  const openFlags: { level: "MEDIUM" | "HIGH"; resolvedAt: Date | null }[] = [];
  const openCodes = new Set<string>();
  for (const p of ancSchedule(mother.lmp)) {
    const reading = opts.readings[p.contactNo - 1];
    const visit = await db.visit.create({
      data: {
        motherId: mother.id,
        kind: "ANC",
        contactNo: p.contactNo,
        gestationWeek: p.week,
        dueDate: p.dueDate,
        attendedAt: reading ? p.dueDate : null,
        bpSys: reading?.bp[0] ?? null,
        bpDia: reading?.bp[1] ?? null,
        weightKg: reading?.weight ?? null,
        hbGdl: reading?.hb ?? null,
        signs: Object.fromEntries(
          Object.entries(reading?.signs ?? {}).filter(([, on]) => on),
        ),
      },
    });
    if (!reading) continue;
    const assessment = assessVisit({
      bpSys: reading.bp[0],
      bpDia: reading.bp[1],
      hbGdl: reading.hb,
      signs: reading.signs,
    });
    for (const reason of assessment.reasons) {
      if (openCodes.has(reason.code)) continue;
      openCodes.add(reason.code);
      openFlags.push({ level: reason.level, resolvedAt: null });
      await db.riskFlag.create({
        data: {
          motherId: mother.id,
          reason: reason.text,
          level: reason.level,
          code: reason.code,
          sourceId: visit.id,
          createdAt: p.dueDate,
        },
      });
    }
  }
  await db.mother.update({
    where: { id: mother.id },
    data: { riskLevel: overallRisk(openFlags) },
  });
  return mother;
}

async function main() {
  let area = await db.area.findFirst({ where: { name: "Demo Area" } });
  area ??= await db.area.create({
    data: { name: "Demo Area", state: "Oyo", lga: "Ibarapa Central" },
  });

  const facilityData = [
    {
      name: "Aboyun Primary Health Centre",
      phone: "+2348000000001",
      hasCSection: false,
      hasBlood: false,
    },
    {
      name: "Aboyun General Hospital",
      phone: "+2348000000002",
      hasCSection: true,
      hasBlood: true,
    },
  ];
  const facilities = [];
  for (const f of facilityData) {
    const found = await db.facility.findFirst({ where: { name: f.name } });
    facilities.push(
      found ?? (await db.facility.create({ data: { ...f, areaId: area.id } })),
    );
  }
  const [phc, hospital] = facilities;

  await upsertStaff({
    email: "admin@aboyun.test",
    name: "System Admin",
    role: "SYSTEM_ADMIN",
  });
  await upsertStaff({
    email: "clinic@aboyun.test",
    name: "PHC Nurse",
    role: "CLINIC",
    facilityId: phc.id,
  });
  // A second clinic at the hospital, to check that clinics only ever see their own mothers.
  await upsertStaff({
    email: "clinic2@aboyun.test",
    name: "Hospital Nurse",
    role: "CLINIC",
    facilityId: hospital.id,
  });

  // Demo mother, linked to a login so /mother can be tried (email or phone + password).
  const motherUser = await upsertStaff({
    email: "mother@aboyun.test",
    name: "Demo Mother",
    role: "MOTHER",
    phoneNumber: "+2348000000100",
  });

  const mother = await seedMother({
    facilityId: phc.id,
    userId: motherUser.id,
    name: "Demo Mother",
    phone: "+2348000000100",
    language: "en",
    weeks: 20,
    family: { name: "Demo Husband", phone: "+2348000000101", relation: "Husband" },
    readings: [{ bp: [116, 72], weight: 61.5, hb: 11.8 }],
  });

  // More mothers at the clinic, matching the design: one to refer, one with a severe Hb and an
  // open emergency, a missed visit, a low Hb, and two with no concerns.
  const normal = (n: number): Reading[] =>
    Array.from({ length: n }, (_, i) => ({
      bp: [114 + i * 2, 72 + i] as [number, number],
      weight: 60 + i * 2.3,
      hb: 11.6,
    }));
  type DemoMother = Omit<Parameters<typeof seedMother>[0], "facilityId" | "userId">;
  const demo: DemoMother[] = [
    {
      name: "Funmilayo Adeyemi",
      phone: "+2348025550118",
      language: "yo",
      weeks: 31,
      family: { name: "Tunde Adeyemi", phone: "+2348025550119", relation: "Husband" },
      readings: [
        { bp: [118, 74], weight: 62.0, hb: 11.4 },
        { bp: [122, 78], weight: 64.5, hb: 11.0 },
        { bp: [128, 82], weight: 67.1, hb: 10.6 },
        { bp: [168, 112], weight: 69.8, hb: 10.2 },
      ] as Reading[],
    },
    {
      name: "Ngozi Eze",
      phone: "+2348055550173",
      language: "ig",
      weeks: 36,
      family: { name: "Chidi Eze", phone: "+2348055550174", relation: "Husband" },
      readings: [...normal(5), { bp: [136, 86], weight: 70.2, hb: 6.8 } as Reading],
    },
    {
      name: "Aisha Bello",
      phone: "+2348035550142",
      language: "ha",
      weeks: 27,
      family: { name: "Musa Bello", phone: "+2348035550143", relation: "Husband" },
      readings: [
        { bp: [112, 70], weight: 58.0, hb: 11.3 },
        { bp: [118, 74], weight: 60.2, hb: 11.1 },
      ],
    },
    {
      name: "Blessing Udo",
      phone: "+2348065550190",
      language: "pcm",
      weeks: 29,
      family: { name: "Emem Udo", phone: "+2348065550191", relation: "Sister" },
      readings: [...normal(2), { bp: [120, 76], weight: 66.4, hb: 9.4 } as Reading],
    },
    {
      name: "Adaeze Okafor",
      phone: "+2348075550126",
      language: "ig",
      weeks: 33,
      family: { name: "Emeka Okafor", phone: "+2348075550127", relation: "Husband" },
      readings: normal(4),
    },
    {
      name: "Zainab Musa",
      phone: "+2348095550161",
      language: "ha",
      weeks: 19,
      family: { name: "Ibrahim Musa", phone: "+2348095550162", relation: "Husband" },
      readings: normal(1),
    },
  ];
  for (const m of demo) {
    const created = await seedMother({ facilityId: phc.id, ...m });
    if (m.name === "Ngozi Eze") {
      const open = await db.emergency.findFirst({
        where: { motherId: created.id, status: "OPEN" },
      });
      if (!open) {
        await db.emergency.create({
          data: {
            motherId: created.id,
            source: "USSD",
            kind: "BLEEDING",
            facilityId: phc.id,
            createdAt: new Date(Date.now() - 12 * 60_000),
          },
        });
      }
    }
  }

  console.log(
    `Seeded. Staff password: ${process.env.SEED_PASSWORD ? "(from SEED_PASSWORD)" : "see prisma/seed.ts"}`,
  );
  console.log(
    "Logins: admin@aboyun.test (SYSTEM_ADMIN), clinic@aboyun.test and clinic2@aboyun.test (CLINIC), " +
      "mother@aboyun.test or +2348000000100 (MOTHER)",
  );
  console.log(`Demo mother id: ${mother.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
