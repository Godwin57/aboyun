import { ChevronRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RegisterMotherDialog } from "@/components/clinic/register-mother-dialog";
import { RiskBadge } from "@/components/clinic/risk-badge";
import { requireRole } from "@/lib/auth";
import { formatDay, formatShort } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getClinicShellInfo } from "@/lib/services/dashboard";
import { listMothers, type MotherRow } from "@/lib/services/mothers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mothers" };

type Search = {
  q?: string;
  risk?: string;
  stage?: string;
  page?: string;
  register?: string;
};

const RISKS = { high: "HIGH", medium: "MEDIUM", low: "LOW" } as const;
const STAGES = { pregnant: "PREGNANT", postnatal: "POSTNATAL" } as const;

function href(params: { q?: string; risk?: string; stage?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.risk) search.set("risk", params.risk);
  if (params.stage) search.set("stage", params.stage);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/clinic/mothers?${query}` : "/clinic/mothers";
}

function Chip({
  active,
  to,
  children,
}: {
  active: boolean;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-4",
        active ? "btn-gradient font-semibold" : "neu-raised text-foreground font-medium",
      )}
    >
      {children}
    </Link>
  );
}

function stageText(m: MotherRow) {
  if (m.status === "POSTNATAL") return { main: "Postnatal", note: "After birth" };
  return { main: "Pregnant", note: `${m.weeks} weeks, due ${formatShort(m.edd)}` };
}

export default async function MothersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const session = await requireRole("CLINIC");

  const risk = RISKS[sp.risk as keyof typeof RISKS];
  const stage = STAGES[sp.stage as keyof typeof STAGES];
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [list, info] = await Promise.all([
    listMothers(session, { q: sp.q, risk, stage, page }),
    getClinicShellInfo(session),
  ]);
  const { mothers, total, counts, pageSize } = list;

  const q = sp.q?.trim() || undefined;
  const first = total === 0 ? 0 : (list.page - 1) * pageSize + 1;
  const last = Math.min(total, list.page * pageSize);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl leading-tight font-semibold">Mothers</h1>
          <p className="text-muted-foreground mt-1">
            {counts.ALL} registered at {info.facilityName}, highest risk first
          </p>
        </div>
        <RegisterMotherDialog defaultOpen={sp.register === "1"} />
      </header>

      <section
        aria-label="Search and filters"
        className="flex flex-wrap items-center gap-3"
      >
        <form
          action="/clinic/mothers"
          method="get"
          role="search"
          className="relative block min-w-[280px] flex-[1_1_280px]"
        >
          <label htmlFor="q" className="sr-only">
            Search mothers by name or phone
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 size-5"
            aria-hidden
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by name or phone"
            className="neu-inset focus-visible:ring-ring/40 h-12 w-full pr-4 pl-11 text-base outline-none focus-visible:ring-3"
          />
          {sp.risk && <input type="hidden" name="risk" value={sp.risk} />}
          {sp.stage && <input type="hidden" name="stage" value={sp.stage} />}
        </form>
        <div role="group" aria-label="Filter by risk" className="flex flex-wrap gap-2">
          <Chip active={!risk} to={href({ q, stage: sp.stage })}>
            All
          </Chip>
          <Chip active={risk === "HIGH"} to={href({ q, risk: "high", stage: sp.stage })}>
            High risk ({counts.HIGH})
          </Chip>
          <Chip
            active={risk === "MEDIUM"}
            to={href({ q, risk: "medium", stage: sp.stage })}
          >
            Medium ({counts.MEDIUM})
          </Chip>
          <Chip active={risk === "LOW"} to={href({ q, risk: "low", stage: sp.stage })}>
            Low ({counts.LOW})
          </Chip>
        </div>
        <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-2">
          <Chip
            active={stage === "PREGNANT"}
            to={href({
              q,
              risk: sp.risk,
              stage: stage === "PREGNANT" ? undefined : "pregnant",
            })}
          >
            Pregnant
          </Chip>
          <Chip
            active={stage === "POSTNATAL"}
            to={href({
              q,
              risk: sp.risk,
              stage: stage === "POSTNATAL" ? undefined : "postnatal",
            })}
          >
            Postnatal
          </Chip>
        </div>
      </section>

      <section aria-label="Mothers" className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[15px]">
            <thead>
              <tr className="text-muted-foreground bg-gradient-to-b from-[#f6f3ec] to-[#ece8de] text-left text-[13px] tracking-wide uppercase">
                <th scope="col" className="px-6 py-3.5 font-semibold">
                  Mother
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold">
                  Risk
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold">
                  Stage
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold">
                  Next visit
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold">
                  Last reading
                </th>
                <th scope="col" className="w-10 py-3.5 pr-6 pl-4">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {mothers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted-foreground px-6 py-12 text-center"
                  >
                    {q || risk || stage
                      ? "No mothers match these filters."
                      : "No mothers registered yet."}
                  </td>
                </tr>
              )}
              {mothers.map((m) => {
                const stageInfo = stageText(m);
                return (
                  <tr key={m.id} className="border-t border-[#e6dfd2] hover:bg-white/50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/clinic/mothers/${m.id}`}
                        className="text-foreground text-base font-semibold hover:underline"
                      >
                        {m.name}
                      </Link>
                      <div className="text-muted-foreground mt-0.5 text-sm">
                        {formatPhone(m.phone)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <RiskBadge level={m.riskLevel} />
                      {m.reason && (
                        <div className="text-muted-foreground mt-1 text-[13px]">
                          {m.reason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{stageInfo.main}</div>
                      <div className="text-muted-foreground text-sm">
                        {stageInfo.note}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {m.nextVisit ? (
                        <>
                          <div className="font-medium">
                            {formatDay(m.nextVisit.dueDate)}
                          </div>
                          <div
                            className={cn(
                              "text-sm",
                              m.nextVisit.overdue
                                ? "font-medium text-[#8c1d18]"
                                : "text-muted-foreground",
                            )}
                          >
                            Contact {m.nextVisit.contactNo ?? "?"} of 8
                            {m.nextVisit.overdue ? ", overdue" : ""}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">None scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {m.lastReading
                        ? `${m.lastReading.bpSys}/${m.lastReading.bpDia}${m.lastReading.hbGdl ? `, Hb ${m.lastReading.hbGdl}` : ""}`
                        : "No readings yet"}
                    </td>
                    <td className="py-4 pr-6 pl-4">
                      <Link
                        href={`/clinic/mothers/${m.id}`}
                        aria-label={`Open ${m.name}'s record`}
                        className="text-muted-foreground inline-flex size-11 items-center justify-center rounded-[10px]"
                      >
                        <ChevronRight className="size-5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t border-[#e6dfd2] px-6 py-3.5 text-sm">
          <span>
            Showing {first} to {last} of {total}
          </span>
          <span className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={href({ q, risk: sp.risk, stage: sp.stage, page: list.page - 1 })}
                className="neu-raised text-foreground inline-flex min-h-11 items-center rounded-[10px] px-4 font-medium"
              >
                Previous
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-[10px] bg-[#f3efe7] px-4 font-medium text-[#8a9692]">
                Previous
              </span>
            )}
            {last < total ? (
              <Link
                href={href({ q, risk: sp.risk, stage: sp.stage, page: list.page + 1 })}
                className="neu-raised text-foreground inline-flex min-h-11 items-center rounded-[10px] px-4 font-medium"
              >
                Next
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-[10px] bg-[#f3efe7] px-4 font-medium text-[#8a9692]">
                Next
              </span>
            )}
          </span>
        </div>
      </section>
    </>
  );
}
