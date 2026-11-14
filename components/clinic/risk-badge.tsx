import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import type { RiskLevel } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const STYLES: Record<
  RiskLevel,
  { label: string; className: string; Icon: typeof Check }
> = {
  HIGH: { label: "High", className: "bg-[#fbe7e4] text-[#8c1d18]", Icon: TriangleAlert },
  MEDIUM: {
    label: "Medium",
    className: "bg-[#fdf1d0] text-[#6b4a00]",
    Icon: CircleAlert,
  },
  LOW: { label: "Low", className: "bg-[#e3f1ee] text-[#0a4f49]", Icon: Check },
};

/** Risk is always a word and an icon as well as a colour, never colour alone. */
export function RiskBadge({
  level,
  label,
  className,
}: {
  level: RiskLevel;
  /** Override the word, e.g. "Refer now" or "Missed visit". */
  label?: string;
  className?: string;
}) {
  const { label: defaultLabel, className: tone, Icon } = STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
      {label ?? defaultLabel}
    </span>
  );
}
