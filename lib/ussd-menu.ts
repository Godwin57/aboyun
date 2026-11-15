// The USSD menu as a pure function: given everything the caller has typed so far (Africa's
// Talking sends it as "1*2*1") and who the caller is, return the next screen.
// "CON" keeps the session open, "END" closes it. When a session needs something done (an
// emergency, a symptom check, a saved language) the reply carries an `action` for the webhook.
// No imports from the app, so it runs the same in the webhook and in tests.
//
// Only a registered mother can use the USSD. Family contacts do not: they only receive
// emergency alerts. Anyone else is told the number is not registered.
//
// Every session of a mother starts with a welcome screen shown in English and in her saved
// language, offering "1. Continue" or "2. Language":
//
//   (nothing)      welcome
//   1              continue in the saved language  -> main menu
//   2              language list
//   2*N            language N chosen               -> main menu in that language
//
// The rest of the menu follows that prefix. The chosen language is worked out from the prefix
// on every request, so nothing has to be remembered between requests. The choice is also saved
// to her profile.

import { assessSymptoms, type SymptomAnswers, type SymptomResult } from "./symptoms";
import {
  fill,
  LANG_NAMES,
  LANGS,
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
      /** Her saved language. */
      lang: Lang;
      /** Her next unattended visit, already formatted. */
      nextVisit: { dateText: string; contactNo: number | null } | null;
    }
  | {
      /** Not a registered mother (family contacts are not registered users either). */
      actor: "unknown";
      lang: Lang;
    };

export type UssdAction =
  | {
      kind: "emergency";
      emergencyKind: EmergencyKindCode;
    }
  | {
      kind: "symptoms";
      answers: SymptomAnswers;
      result: SymptomResult;
    }
  | {
      /** She picked a language from the menu: save it to her profile. */
      kind: "setLanguage";
      lang: Lang;
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

/** "English / Igbo": the English words, then the same in her language (English only if she uses English). */
function bilingual(lang: Lang, english: string, local: string): string {
  return lang === "en" ? english : `${english} / ${local}`;
}

/** The first screen of every session: welcome, in English and in her language. */
export function welcomeScreen(lang: Lang): string {
  const t = USSD_TEXTS[lang];
  return [
    bilingual(lang, "Welcome to Aboyun", t.welcomeWord),
    `1. ${bilingual(lang, "Continue", t.continueWord)}`,
    `2. ${bilingual(lang, "Language", t.languageWord)}`,
  ].join("\n");
}

/** The language list: each language written in itself, so anyone can find theirs. */
export function languageScreen(lang: Lang): string {
  const t = USSD_TEXTS[lang];
  const names = LANGS.map((code, i) => `${i + 1}. ${LANG_NAMES[code]}`);
  return [bilingual(lang, "Choose language", t.chooseLanguage), ...names].join("\n");
}

export function ussdMenu(text: string, ctx: UssdContext): UssdReply {
  // Not a registered mother: nothing is offered, the session just ends.
  if (ctx.actor === "unknown") return end(USSD_TEXTS[ctx.lang].unknownEnd);

  const inputs = parseUssdInput(text);
  if (inputs.length === 0) return con(welcomeScreen(ctx.lang));

  let lang = ctx.lang;
  let rest: string[];
  if (inputs[0] === "1") {
    rest = inputs.slice(1);
  } else if (inputs[0] === "2") {
    if (inputs.length === 1) return con(languageScreen(ctx.lang));
    const chosen = LANGS[Number.parseInt(inputs[1], 10) - 1];
    if (!chosen || !/^\d$/.test(inputs[1])) return end(USSD_TEXTS[ctx.lang].wrong);
    lang = chosen;
    rest = inputs.slice(2);
    // Right after the choice: carry it out once, then show the main menu in that language.
    if (rest.length === 0) {
      return { ...con(USSD_TEXTS[lang].main), action: { kind: "setLanguage", lang } };
    }
  } else {
    return end(USSD_TEXTS[ctx.lang].wrong);
  }

  return motherMenu(rest, lang, ctx.nextVisit);
}

function motherMenu(
  inputs: string[],
  lang: Lang,
  nextVisit: { dateText: string; contactNo: number | null } | null,
): UssdReply {
  const t = USSD_TEXTS[lang];
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
      return symptomStep(inputs.slice(1), lang);
    case "3": {
      if (inputs.length !== 1) return end(t.wrong);
      if (!nextVisit) return end(t.noVisit);
      return end(
        fill(t.nextVisit, { date: nextVisit.dateText, n: nextVisit.contactNo ?? "?" }),
      );
    }
    default:
      return end(t.wrong);
  }
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
