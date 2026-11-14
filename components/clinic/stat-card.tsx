export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <div className="neu-card flex flex-col gap-1.5 p-5">
      <div className="text-muted-foreground text-sm font-medium">{label}</div>
      <div className="font-heading text-[44px] leading-none font-semibold">{value}</div>
      <div className="text-muted-foreground text-sm">{note}</div>
    </div>
  );
}
