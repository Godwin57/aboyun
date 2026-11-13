import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { addDays, addWeeks } from "date-fns";
import { PrismaClient } from "../lib/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Dev-only credentials for the seeded staff accounts. Never use these in production.
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe123!";

async function upsertStaff(opts: {
  email: string;
  name: string;
  role: "SYSTEM_ADMIN" | "CLINIC";
  facilityId?: string;
}) {
  const user = await db.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      email: opts.email,
      name: opts.name,
      role: opts.role,
      facilityId: opts.facilityId,
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
  const [phc] = facilities;

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

  // Demo mother, linked to a login so /mother can be tried (phone one-time code).
  const motherUser = await db.user.upsert({
    where: { email: "2348000000100@phone.aboyun.invalid" },
    update: {},
    create: {
      email: "2348000000100@phone.aboyun.invalid",
      name: "Demo Mother",
      phoneNumber: "+2348000000100",
      phoneNumberVerified: true,
      role: "MOTHER",
    },
  });

  let mother = await db.mother.findUnique({ where: { userId: motherUser.id } });
  if (!mother) {
    const lmp = addWeeks(new Date(), -20);
    mother = await db.mother.create({
      data: {
        userId: motherUser.id,
        name: "Demo Mother",
        phone: "+2348000000100",
        language: "en",
        lmp,
        edd: addDays(lmp, 280),
        facilityId: phc.id,
        familyContacts: {
          create: { name: "Demo Husband", phone: "+2348000000101", relation: "Husband" },
        },
      },
    });
  }

  console.log(
    `Seeded. Staff password: ${process.env.SEED_PASSWORD ? "(from SEED_PASSWORD)" : "see prisma/seed.ts"}`,
  );
  console.log("Logins: admin@aboyun.test (SYSTEM_ADMIN), clinic@aboyun.test (CLINIC)");
  console.log(`Demo mother id: ${mother.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
