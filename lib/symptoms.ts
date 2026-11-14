// Symptom check for mothers (app, USSD and SMS). Pure functions with no imports from the
// app, so the browser and the server share one copy.
//
// Rules:
//   Vaginal bleeding or fits                  -> GO_NOW   (go to a facility now)
//   Two or more danger signs                  -> GO_NOW
//   One other danger sign                     -> CLINIC_SOON
//   No danger signs                           -> OK

export const SYMPTOM_SIGNS = [
  "bleeding",
  "headache",
  "vision",
  "fits",
  "movement",
  "fever",
  "swelling",
  "pain",
] as const;
export type SymptomSign = (typeof SYMPTOM_SIGNS)[number];

export type SymptomResult = "OK" | "CLINIC_SOON" | "GO_NOW";

/** Signs that always mean "go now", even on their own. */
const GO_NOW_ALONE: readonly SymptomSign[] = ["bleeding", "fits"];

export type SymptomAnswers = Partial<Record<SymptomSign, boolean>>;

/** The signs she said yes to. */
export function reportedSigns(answers: SymptomAnswers): SymptomSign[] {
  return SYMPTOM_SIGNS.filter((sign) => answers[sign] === true);
}

export function assessSymptoms(answers: SymptomAnswers): SymptomResult {
  const signs = reportedSigns(answers);
  if (signs.length === 0) return "OK";
  if (signs.some((s) => GO_NOW_ALONE.includes(s)) || signs.length >= 2) return "GO_NOW";
  return "CLINIC_SOON";
}
