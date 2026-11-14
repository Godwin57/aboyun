import { ArrowLeft, Check, Phone, Plus, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ReferButton,
  ResendInviteButton,
  ResolveFlagButton,
} from "@/components/clinic/mother-actions";
import { motherHasPassword } from "@/lib/services/mother-invites";
import { RiskBadge } from "@/components/clinic/risk-badge";
import { LANGUAGE_NAMES, type LanguageCode } from "@/lib/clinic-validation";
import { requireRole } from "@/lib/auth";
import { formatDay, formatDayYear, relativeDays } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { assessVisit, isReferCode } from "@/lib/risk";
import { gestationalAge, startOfUtcDay } from "@/lib/schedule";
import { getMother } from "@/lib/services/mothers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mother record" };

const card = "neu-card flex flex-col gap-3.5 px-6 py-5";
const cardTitle = "font-heading text-[22px] font-semibold";

export default async function MotherRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("CLINIC");
  const mother = await getMother(session, id);
  if (!mother) notFound();

  const needsPassword = !(await motherHasPassword(mother.userId));

  const today = startOfUtcDay(new Date());
  const age = gestationalAge(mother.lmp, today);
  const openFlags = mother.riskFlags.filter((f) => f.resolvedAt === null);
  const closedFlags = mother.riskFlags.filter((f) => f.resolvedAt !== null);
  const referFlags = openFlags.filter((f) => isReferCode(f.code));
  const unreferred = referFlags.filter((f) => f.referralId === null);
  const latestReferral = mother.referrals[0];

  const firstOpen = mother.visits.find((v) => v.attendedAt === null);
  const doneCount = mother.visits.filter((v) => v.attendedAt !== null).length;
  const flagsByVisit = new Map<string, typeof mother.riskFlags>();
  for (const f of mother.riskFlags) {
    if (!f.sourceId) continue;
    flagsByVisit.set(f.sourceId, [...(flagsByVisit.get(f.sourceId) ?? []), f]);
  }

  const language = LANGUAGE_NAMES[mother.language as LanguageCode] ?? mother.language;

  return (
    <>
      <div>
        <Link
          href="/clinic/mothers"
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to mothers
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="font-heading text-4xl leading-tight font-semibold">
              {mother.name}
            </h1>
            <RiskBadge
              level={mother.riskLevel}
              label={`${{ HIGH: "High", MEDIUM: "Medium", LOW: "Low" }[mother.riskLevel]} risk`}
            />
          </div>
          <p className="text-muted-foreground mt-1.5 text-base">
            {mother.status === "POSTNATAL"
              ? "Postnatal."
              : `Pregnant, ${age.weeks} weeks. Due ${formatDayYear(mother.edd)}.`}
          </p>
        </div>
        {firstOpen && (
          <Link
            href={`/clinic/mothers/${mother.id}/visit?contact=${firstOpen.contactNo ?? ""}`}
            className="btn-gradient inline-flex min-h-12 items-center gap-2.5 rounded-xl px-[22px] text-base font-semibold"
          >
            <Plus className="size-5" strokeWidth={2.2} aria-hidden />
            Record a visit
          </Link>
        )}
      </header>

      {unreferred.length > 0 && (
        <section
          aria-labelledby="refer"
          className="alert-danger flex flex-wrap items-center gap-5 px-6 py-[22px]"
        >
          <span className="inline-flex size-12 flex-none items-center justify-center rounded-full bg-[#b3261e] text-white">
            <TriangleAlert className="size-[26px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-[1_1_380px]">
            <h2 id="refer" className="text-xl font-semibold text-[#8c1d18]">
              Refer now:{" "}
              {unreferred
                .map((f) => f.reason.replace(/\s*\(.*\)$/, "").toLowerCase())
                .join(", ")}
            </h2>
            <p className="mt-1.5 leading-relaxed text-[#5c2420]">
              {unreferred.map((f) => f.reason).join(". ")}. She should see a doctor today.
              Flagged {relativeDays(unreferred[0].createdAt)}. She has not been referred
              yet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {mother.phone && (
              <a
                href={`tel:${mother.phone}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#b3261e] bg-white px-[18px] font-semibold text-[#8c1d18]"
              >
                <Phone className="size-[18px]" aria-hidden />
                Call her
              </a>
            )}
            <ReferButton motherId={mother.id} />
          </div>
        </section>
      )}

      {unreferred.length === 0 && referFlags.length > 0 && latestReferral && (
        <section className="neu-card flex flex-wrap items-center gap-4 px-6 py-5">
          <span className="inline-flex size-11 flex-none items-center justify-center rounded-full bg-[#0f6b63] text-white">
            <Check className="size-6" strokeWidth={2.6} aria-hidden />
          </span>
          <div>
            <div className="text-lg font-semibold">
              Referred to {latestReferral.toFacility.name}
            </div>
            <div className="text-muted-foreground">
              {formatDay(latestReferral.createdAt)}. {latestReferral.reason}. Close the
              flag when the doctor has seen her.
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="visits"
          className="neu-card min-w-0 flex-[3_1_520px] overflow-hidden"
        >
          <div className="px-6 pt-5 pb-3">
            <h2 id="visits" className="font-heading text-[22px] font-semibold">
              Antenatal visits
            </h2>
            <div className="text-muted-foreground mt-0.5 text-sm">
              8 contacts. {doneCount} done
              {firstOpen ? `, next on ${formatDay(firstOpen.dueDate)}` : ""}
            </div>
          </div>
          <ol>
            {mother.visits.map((v) => {
              const done = v.attendedAt !== null;
              const next = v.id === firstOpen?.id;
              const overdue = !done && v.dueDate.getTime() < today.getTime();
              const reasons = assessVisit({
                bpSys: v.bpSys,
                bpDia: v.bpDia,
                hbGdl: v.hbGdl,
              });
              const bpBad = reasons.reasons.some(
                (r) => r.code === "BP_SEVERE" || r.code === "BP_HIGH",
              );
              const visitFlags = flagsByVisit.get(v.id) ?? [];
              return (
                <li
                  key={v.id}
                  className="flex items-start gap-4 border-t border-[#e6dfd2] px-6 py-4"
                >
                  {done ? (
                    <span className="inline-flex size-8 flex-none items-center justify-center rounded-full bg-[#0f6b63] text-white">
                      <Check
                        className="size-[18px]"
                        strokeWidth={2.6}
                        aria-label="Done"
                      />
                    </span>
                  ) : next ? (
                    <span className="inline-flex size-8 flex-none items-center justify-center rounded-full bg-[#f4c24f] font-semibold text-[#4a3410]">
                      {v.contactNo}
                    </span>
                  ) : (
                    <span className="text-muted-foreground inline-flex size-8 flex-none items-center justify-center rounded-full border-2 border-[#d9d0be] font-semibold">
                      {v.contactNo}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">
                        Contact {v.contactNo} · {v.gestationWeek} weeks
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {done ? formatDay(v.attendedAt!) : formatDay(v.dueDate)}
                      </span>
                    </div>
                    {done && (
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        <span>
                          <span className="text-muted-foreground">BP </span>
                          <span
                            className={cn("font-semibold", bpBad && "text-[#8c1d18]")}
                          >
                            {v.bpSys}/{v.bpDia}
                          </span>
                        </span>
                        {v.weightKg && (
                          <span>
                            <span className="text-muted-foreground">Weight </span>
                            <span className="font-semibold">{v.weightKg} kg</span>
                          </span>
                        )}
                        {v.hbGdl && (
                          <span>
                            <span className="text-muted-foreground">Hb </span>
                            <span className="font-semibold">{v.hbGdl}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {visitFlags.map((f) => (
                      <div key={f.id} className="mt-2 text-sm font-medium text-[#8c1d18]">
                        {f.level === "HIGH" ? "High" : "Medium"}: {f.reason}
                      </div>
                    ))}
                    {next && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm font-medium text-[#6b4a00]">
                        {overdue ? "Overdue. " : "Next visit. "}
                        <Link
                          href={`/clinic/mothers/${mother.id}/visit?contact=${v.contactNo ?? ""}`}
                          className="font-semibold text-[#0f6b63] underline underline-offset-2"
                        >
                          Record this visit
                        </Link>
                      </div>
                    )}
                    {!done && !next && overdue && (
                      <div className="mt-1.5 text-sm font-medium text-[#8c1d18]">
                        Overdue
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-6">
          <section aria-labelledby="flags" className={card}>
            <h2 id="flags" className={cardTitle}>
              Risk flags
            </h2>
            {openFlags.length === 0 && (
              <p className="text-muted-foreground">No open flags.</p>
            )}
            {openFlags.map((f, i) => (
              <div
                key={f.id}
                className={cn(
                  "flex items-start gap-3",
                  i > 0 && "border-t border-[#efe9dc] pt-3.5",
                )}
              >
                <RiskBadge level={f.level} className="h-7 flex-none text-[13px]" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{f.reason}</div>
                  <div className="text-muted-foreground text-sm">
                    Flagged {relativeDays(f.createdAt)}
                    {f.referralId ? ". Referred." : ". Open."}
                  </div>
                  <div className="mt-2">
                    <ResolveFlagButton flagId={f.id} motherId={mother.id} />
                  </div>
                </div>
              </div>
            ))}
            {closedFlags.length > 0 && (
              <details className="border-t border-[#efe9dc] pt-3">
                <summary className="text-muted-foreground cursor-pointer text-sm">
                  {closedFlags.length} closed
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {closedFlags.map((f) => (
                    <li key={f.id} className="text-muted-foreground">
                      {f.reason} (closed {formatDay(f.resolvedAt!)})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section aria-labelledby="about" className={card}>
            <h2 id="about" className={cardTitle}>
              About her
            </h2>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-[15px]">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{formatPhone(mother.phone) || "Not given"}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd
                className={cn(
                  "font-medium break-all",
                  !mother.email && "text-muted-foreground",
                )}
              >
                {mother.email ?? "Not given"}
              </dd>
              <dt className="text-muted-foreground">Language</dt>
              <dd className="font-medium">{language}</dd>
              <dt className="text-muted-foreground">Last period</dt>
              <dd className="font-medium">{formatDayYear(mother.lmp)}</dd>
              <dt className="text-muted-foreground">Registered</dt>
              <dd className="font-medium">{formatDayYear(mother.createdAt)}</dd>
              <dt className="text-muted-foreground">Consent</dt>
              <dd className="font-medium">
                {mother.consentAt ? formatDayYear(mother.consentAt) : "Not recorded"}
              </dd>
            </dl>
            {needsPassword && (
              <div className="border-t border-[#efe9dc] pt-3.5">
                <p className="text-muted-foreground mb-2 text-sm">
                  She has not set her password yet.
                </p>
                <ResendInviteButton motherId={mother.id} />
              </div>
            )}
          </section>

          <section aria-labelledby="family" className={card}>
            <h2 id="family" className={cardTitle}>
              Family contacts
            </h2>
            {mother.familyContacts.length === 0 && (
              <p className="text-muted-foreground">None added.</p>
            )}
            {mother.familyContacts.map((f) => (
              <div
                key={f.id}
                className="flex min-h-11 items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold">{f.name}</div>
                  <div className="text-muted-foreground text-sm">{f.relation}</div>
                </div>
                <span className="font-medium">{formatPhone(f.phone)}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
