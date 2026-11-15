// What a text message to Aboyun means. Pure, with no imports.
//
//   "1"                  confirm a reminder
//   "E", "HELP", "SOS"   emergency, kind not given
//   "E BLEEDING" / "E B" bleeding;  "E LABOUR" / "E L" labour;  "E FITS" / "E F" fits;
//   "E BABY" / "E C" a problem with the baby;  "E OTHER" / "E O" something else

export type EmergencyKindCode = "BLEEDING" | "LABOUR" | "FITS" | "BABY" | "OTHER";

export type SmsCommand =
  | { kind: "confirm" }
  | { kind: "emergency"; emergencyKind: EmergencyKindCode }
  | { kind: "unknown" };

const TRIGGERS = new Set(["E", "HELP", "SOS", "EMERGENCY"]);

const KINDS: Record<string, EmergencyKindCode> = {
  B: "BLEEDING",
  BLEEDING: "BLEEDING",
  BLOOD: "BLEEDING",
  L: "LABOUR",
  LABOUR: "LABOUR",
  LABOR: "LABOUR",
  F: "FITS",
  FITS: "FITS",
  C: "BABY",
  CHILD: "BABY",
  BABY: "BABY",
  O: "OTHER",
  OTHER: "OTHER",
};

export function parseSmsCommand(text: string): SmsCommand {
  const words = text
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return { kind: "unknown" };

  if (words.length === 1 && words[0] === "1") return { kind: "confirm" };

  if (TRIGGERS.has(words[0]) && words.length <= 2) {
    const emergencyKind = words[1] ? KINDS[words[1]] : "OTHER";
    // "E something-we-do-not-know" is still an emergency: better a general alert than none.
    return { kind: "emergency", emergencyKind: emergencyKind ?? "OTHER" };
  }

  return { kind: "unknown" };
}
