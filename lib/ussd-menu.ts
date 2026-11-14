// The USSD menu as a pure function: given everything the caller has typed so far (Africa's
// Talking sends it as "1*2*1") and who the caller is, return the next screen.
// "CON" keeps the session open, "END" closes it. When a session ends with a request
// (an emergency, a symptom check) the reply carries an `action` for the webhook to carry out.
// No imports from the app, so it runs the same in the webhook and in tests.

import { assessSymptoms, type SymptomAnswers, type SymptomResult } from "./symptoms";
import {
  fill,
  USSD_SYMPTOM_ORDER,
  USSD_TEXTS,
  type Lang,
  type UssdSign,
} from "./ussd-texts";

export type EmergencyKindCode = "BLEEDING" | "LABOUR" | "FITS" | "BABY" | "OTHER";

/** The emergency choices on screen, in order (option 1 to 5). */
export const EMERGENCY_CHOICES: readonly EmergencyKindCode[] = [
  "BLEEDING",
  "LABOUR",
  "FITS",
  "BABY",
  "OTHER",
];

export type UssdContext =
  | {
      actor: "mother";
      lang: Lang;
      /** Her next unattended visit, already formatted. */
      nextVisit: { dateText: string; contactNo: number | null } | null;
    }
  | {
      /** A family contact calling for the mother they are listed under. */
      actor: "family";
      lang: Lang;
      motherName: string;
    }
  | {
      actor: "unknown";
      lang: Lang;
      /** Filled in by the webhook after it looked up the number typed at step 2. */
      typedMother?: { name: string } | null;
    };

export type UssdAction =
  | {
      kind: "emergency";
      emergencyKind: EmergencyKindCode;
      /** An unknown caller helping a mother: the phone number they typed. */
      typedPhone?: string;
    }
  | {
      kind: "symptoms";
      answers: SymptomAnswers;
      result: SymptomResult;
    };

export type UssdReply = {
  type: "CON" | "END";
  text: string;
  action?: UssdAction;
};

const con = (text: string): UssdReply => ({ type: "CON", text });
const end = (text: string, action?: UssdAction): UssdReply => ({
  type: "END",
  text,
  action,
});

export function parseUssdInput(text: string): string[] {
  const trimmed = text.trim();
  return trimmed === "" ? [] : trimmed.split("*");
}

function emergencyChoice(input: string | undefined): EmergencyKindCode | null {
  const n = Number.parseInt(input ?? "", 10);
  return Number.isInteger(n) && n >= 1 && n <= EMERGENCY_CHOICES.length
    ? EMERGENCY_CHOICES[n - 1]
    : null;
}

export function ussdMenu(text: string, ctx: UssdContext): UssdReply {
  const t = USSD_TEXTS[ctx.lang];
  const inputs = parseUssdInput(text);

  if (ctx.actor === "mother") {
    if (inputs.length === 0) return con(t.main);

    switch (inputs[0]) {
      case "1": {
        if (inputs.length === 1) return con(t.emergencyAsk);
        const kind = emergencyChoice(inputs[1]);
        if (inputs.length === 2 && kind) {
          return end(t.emergencySent, { kind: "emergency", emergencyKind: kind });
        }
        return end(t.wrong);
      }
      case "2":
        return symptomStep(inputs.slice(1), ctx.lang);
      case "3": {
        if (inputs.length !== 1) return end(t.wrong);
        if (!ctx.nextVisit) return end(t.noVisit);
        return end(
          fill(t.nextVisit, {
            date: ctx.nextVisit.dateText,
            n: ctx.nextVisit.contactNo ?? "?",
          }),
        );
      }
      default:
        return end(t.wrong);
    }
  }

  if (ctx.actor === "family") {
    if (inputs.length === 0) return con(fill(t.familyMain, { name: ctx.motherName }));
    if (inputs[0] !== "1") return end(t.wrong);
    if (inputs.length === 1) return con(t.emergencyAsk);
    const kind = emergencyChoice(inputs[1]);
    if (inputs.length === 2 && kind) {
      return end(fill(t.familyEmergencySent, { name: ctx.motherName }), {
        kind: "emergency",
        emergencyKind: kind,
      });
    }
    return end(t.wrong);
  }

  // Unknown caller: the only thing offered is help for a registered mother, by her phone number.
  if (inputs.length === 0) return con(t.unknownMenu);
  if (inputs[0] !== "1") return end(t.unknownEnd);
  if (inputs.length === 1) return con(t.familyAskPhone);

  const typedPhone = inputs[1];
  if (!ctx.typedMother) return end(t.familyNotFound);
  if (inputs.length === 2) return con(t.emergencyAsk);

  const kind = emergencyChoice(inputs[2]);
  if (inputs.length === 3 && kind) {
    return end(fill(t.familyEmergencySent, { name: ctx.typedMother.name }), {
      kind: "emergency",
      emergencyKind: kind,
      typedPhone,
    });
  }
  return end(t.wrong);
}

/** The symptom check: one yes/no question at a time, stopping as soon as the answer is "go now". */
function symptomStep(answerInputs: string[], lang: Lang): UssdReply {
  const t = USSD_TEXTS[lang];
  const answers: SymptomAnswers = {};

  for (let i = 0; i < answerInputs.length; i++) {
    const sign: UssdSign | undefined = USSD_SYMPTOM_ORDER[i];
    const choice = answerInputs[i];
    if (!sign || (choice !== "1" && choice !== "2")) return end(t.wrong);
    answers[sign] = choice === "1";

    // More "yes" answers can only make it worse, so stop as soon as it is "go now".
    if (assessSymptoms(answers) === "GO_NOW") {
      if (i !== answerInputs.length - 1) return end(t.wrong);
      return end(t.resultNow, { kind: "symptoms", answers, result: "GO_NOW" });
    }
  }

  if (answerInputs.length < USSD_SYMPTOM_ORDER.length) {
    return con(t.question[USSD_SYMPTOM_ORDER[answerInputs.length]]);
  }

  const result = assessSymptoms(answers);
  return end(result === "OK" ? t.resultOk : t.resultSoon, {
    kind: "symptoms",
    answers,
    result,
  });
}
