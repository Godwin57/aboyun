// Risk rules for an antenatal visit. Pure functions with no imports, so the browser
// (live risk check on the visit form) and the server (saving flags) share one copy.
//
// Rules, as approved:
//   Blood pressure 160 or more on top, or 110 or more on the bottom -> HIGH, refer now
//   Blood pressure 140/90 or more                                     -> HIGH
//   Hb under 7                                                        -> HIGH, refer now
//   Hb 7 to 10.9                                                      -> MEDIUM
//   Any danger sign                                                   -> HIGH, refer now

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export const DANGER_SIGNS = [
  "bleeding",
  "headache",
  "vision",
  "fits",
  "movement",
  "fever",
  "swelling",
  "pain",
] as const;
export type DangerSign = (typeof DANGER_SIGNS)[number];

export const DANGER_SIGN_LABELS: Record<DangerSign, string> = {
  bleeding: "Vaginal bleeding",
  headache: "Severe headache",
  vision: "Blurred vision",
  fits: "Fits or convulsions",
  movement: "Baby moving less",
  fever: "Fever",
  swelling: "Swelling of face or hands",
  pain: "Severe belly pain",
};

// Thresholds in one place so the rules are easy to read and to review.
export const SEVERE_BP_SYS = 160;
export const SEVERE_BP_DIA = 110;
export const HIGH_BP_SYS = 140;
export const HIGH_BP_DIA = 90;
export const SEVERE_ANAEMIA_HB = 7;
export const ANAEMIA_HB = 11;

export type VisitReadings = {
  bpSys?: number | null;
  bpDia?: number | null;
  hbGdl?: number | null;
  signs?: Partial<Record<DangerSign, boolean>> | null;
};

export type RiskReason = {
  /** Stable code stored on the flag, e.g. BP_SEVERE, HB_LOW, SIGN_FITS. */
  code: string;
  level: "MEDIUM" | "HIGH";
  text: string;
  /** True when she should be sent to a facility with a doctor now. */
  refer: boolean;
};

export type RiskAssessment = {
  level: RiskLevel;
  /** True if any reason says to refer now. */
  refer: boolean;
  reasons: RiskReason[];
};

const isNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Work out the risk from one visit's readings. */
export function assessVisit(readings: VisitReadings): RiskAssessment {
  const reasons: RiskReason[] = [];
  const { bpSys, bpDia, hbGdl } = readings;

  const severeBp =
    (isNumber(bpSys) && bpSys >= SEVERE_BP_SYS) ||
    (isNumber(bpDia) && bpDia >= SEVERE_BP_DIA);
  const highBp =
    (isNumber(bpSys) && bpSys >= HIGH_BP_SYS) ||
    (isNumber(bpDia) && bpDia >= HIGH_BP_DIA);
  const bpText = `${isNumber(bpSys) ? bpSys : "?"}/${isNumber(bpDia) ? bpDia : "?"}`;

  if (severeBp) {
    reasons.push({
      code: "BP_SEVERE",
      level: "HIGH",
      text: `Severe high blood pressure (${bpText})`,
      refer: true,
    });
  } else if (highBp) {
    reasons.push({
      code: "BP_HIGH",
      level: "HIGH",
      text: `High blood pressure (${bpText})`,
      refer: false,
    });
  }

  if (isNumber(hbGdl)) {
    if (hbGdl < SEVERE_ANAEMIA_HB) {
      reasons.push({
        code: "HB_SEVERE",
        level: "HIGH",
        text: `Severe anaemia (Hb ${hbGdl})`,
        refer: true,
      });
    } else if (hbGdl < ANAEMIA_HB) {
      reasons.push({
        code: "HB_LOW",
        level: "MEDIUM",
        text: `Anaemia (Hb ${hbGdl})`,
        refer: false,
      });
    }
  }

  for (const sign of DANGER_SIGNS) {
    if (readings.signs?.[sign]) {
      reasons.push({
        code: `SIGN_${sign.toUpperCase()}`,
        level: "HIGH",
        text: `Danger sign: ${DANGER_SIGN_LABELS[sign].toLowerCase()}`,
        refer: true,
      });
    }
  }

  return {
    level: highestLevel(reasons.map((r) => r.level)),
    refer: reasons.some((r) => r.refer),
    reasons,
  };
}

/** The most serious of a list of levels. An empty list is LOW. */
export function highestLevel(levels: readonly RiskLevel[]): RiskLevel {
  if (levels.includes("HIGH")) return "HIGH";
  if (levels.includes("MEDIUM")) return "MEDIUM";
  return "LOW";
}

/**
 * A mother's overall risk is the highest level among her open (unresolved) flags.
 * Resolving a flag can therefore lower her risk.
 */
export function overallRisk(
  flags: readonly { level: RiskLevel; resolvedAt: Date | null }[],
): RiskLevel {
  return highestLevel(flags.filter((f) => f.resolvedAt === null).map((f) => f.level));
}

/** Flag codes that mean "refer now" (severe BP, severe anaemia, any danger sign). */
export function isReferCode(code: string | null | undefined): boolean {
  return code === "BP_SEVERE" || code === "HB_SEVERE" || !!code?.startsWith("SIGN_");
}
