import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordVisitForm } from "@/components/clinic/record-visit-form";
import { requireRole } from "@/lib/auth";
import { formatDay } from "@/lib/format";
import { gestationalAge, startOfUtcDay } from "@/lib/schedule";
import { getMother } from "@/lib/services/mothers";

export const metadata: Metadata = { title: "Record a visit" };

export default async function RecordVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contact?: string }>;
}) {
  const { id } = await params;
  const { contact } = await searchParams;
  const session = await requireRole("CLINIC");
  const mother = await getMother(session, id);
  if (!mother) notFound();

  const today = startOfUtcDay(new Date());
  const open = mother.visits.filter((v) => v.attendedAt === null && v.contactNo !== null);
  const requested = Number.parseInt(contact ?? "", 10);
  const selected = open.find((v) => v.contactNo === requested) ?? open[0];

  return (
    <>
      <div>
        <Link
          href={`/clinic/mothers/${mother.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to {mother.name}
        </Link>
        <h1 className="font-heading text-4xl leading-tight font-semibold">
          Record a visit
        </h1>
        <p className="text-muted-foreground mt-1">
          {mother.name}, {gestationalAge(mother.lmp, today).weeks} weeks. The risk check
          updates as you type.
        </p>
      </div>

      {selected ? (
        <RecordVisitForm
          motherId={mother.id}
          motherName={mother.name}
          weeks={gestationalAge(mother.lmp, today).weeks}
          contacts={open.map((v) => ({
            no: v.contactNo!,
            label: `Contact ${v.contactNo} of 8 · ${v.gestationWeek} weeks · due ${formatDay(v.dueDate)}`,
          }))}
          defaultContact={selected.contactNo!}
          todayIso={today.toISOString().slice(0, 10)}
        />
      ) : (
        <p className="neu-card text-muted-foreground px-6 py-8">
          All eight antenatal visits have been recorded for {mother.name}.
        </p>
      )}
    </>
  );
}
