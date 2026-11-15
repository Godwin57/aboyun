import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SYMPTOM_SIGNS } from "./symptoms";
import {
  languageScreen,
  parseUssdInput,
  ussdMenu,
  welcomeScreen,
  type UssdContext,
} from "./ussd-menu";
import { fill, LANGS, USSD_SYMPTOM_ORDER, USSD_TEXTS } from "./ussd-texts";

type MotherCtx = Extract<UssdContext, { actor: "mother" }>;

const mother = (over: Partial<MotherCtx> = {}): UssdContext => ({
  actor: "mother",
  lang: "en",
  nextVisit: { dateText: "Fri 4 Dec", contactNo: 5 },
  ...over,
});

/** After "1. Continue" on the welcome screen. */
const go = (rest = "") => (rest ? `1*${rest}` : "1");

describe("parseUssdInput", () => {
  it("splits what has been typed so far", () => {
    assert.deepEqual(parseUssdInput(""), []);
    assert.deepEqual(parseUssdInput("1"), ["1"]);
    assert.deepEqual(parseUssdInput("2*2*1"), ["2", "2", "1"]);
  });
});

describe("welcome screen", () => {
  it("is the first screen of every session for a mother, and keeps the session open", () => {
    const r = ussdMenu("", mother());
    assert.equal(r.type, "CON");
    assert.equal(r.text, welcomeScreen("en"));
    assert.equal(r.action, undefined);
  });

  it("is English only for a mother who uses English", () => {
    assert.equal(welcomeScreen("en"), "Welcome to Aboyun\n1. Continue\n2. Language");
  });

  it("shows English and her own language side by side when she uses another", () => {
    assert.equal(
      welcomeScreen("ig"),
      "Welcome to Aboyun / Nnọọ\n1. Continue / Gaa n'ihu\n2. Language / Asụsụ",
    );
    for (const lang of LANGS.filter((l) => l !== "en")) {
      const screen = welcomeScreen(lang);
      assert.match(screen, /Welcome to Aboyun \/ /, lang);
      assert.match(screen, /1\. Continue \/ /, lang);
      assert.match(screen, /2\. Language \/ /, lang);
    }
  });

  it("uses the saved language for the local half", () => {
    assert.match(ussdMenu("", mother({ lang: "yo" })).text, /Káàbọ̀/);
    assert.match(ussdMenu("", mother({ lang: "ha" })).text, /Barka da zuwa/);
    assert.match(ussdMenu("", mother({ lang: "pcm" })).text, /Make we continue/);
  });

  it("is also the first screen for a family contact", () => {
    const family: UssdContext = { actor: "family", lang: "ig", motherName: "Ngozi" };
    assert.equal(ussdMenu("", family).text, welcomeScreen("ig"));
  });

  it("anything other than 1 or 2 ends the session", () => {
    for (const text of ["3", "0", "x", "11x"]) {
      const r = ussdMenu(text, mother());
      assert.equal(r.type, "END", text);
      assert.match(r.text, /Wrong choice/, text);
    }
  });
});

describe("language choice", () => {
  it("1 continues in her saved language and shows the main menu", () => {
    const r = ussdMenu("1", mother({ lang: "yo" }));
    assert.equal(r.type, "CON");
    assert.equal(r.text, USSD_TEXTS.yo.main);
    assert.equal(r.action, undefined);
  });

  it("2 lists the languages, each written in itself", () => {
    const r = ussdMenu("2", mother());
    assert.equal(r.type, "CON");
    assert.equal(
      r.text,
      "Choose language\n1. English\n2. Pidgin\n3. Yorùbá\n4. Igbo\n5. Hausa",
    );
  });

  it("the language list is bilingual too", () => {
    assert.match(languageScreen("ha"), /^Choose language \/ Zaɓi harshe\n/);
  });

  it("picking a language shows the main menu in it and asks the webhook to save it", () => {
    const expected = ["en", "pcm", "yo", "ig", "ha"] as const;
    expected.forEach((lang, i) => {
      const r = ussdMenu(`2*${i + 1}`, mother({ lang: "en" }));
      assert.equal(r.type, "CON", lang);
      assert.equal(r.text, USSD_TEXTS[lang].main, lang);
      assert.deepEqual(r.action, { kind: "setLanguage", lang }, lang);
    });
  });

  it("carries the chosen language through the rest of the session, without saving it again", () => {
    // She uses English, picks Igbo (2*4), then Emergency (1).
    const ask = ussdMenu("2*4*1", mother({ lang: "en" }));
    assert.equal(ask.type, "CON");
    assert.equal(ask.text, USSD_TEXTS.ig.emergencyAsk);
    assert.equal(ask.action, undefined);

    const sent = ussdMenu("2*4*1*3", mother({ lang: "en" }));
    assert.equal(sent.type, "END");
    assert.equal(sent.text, USSD_TEXTS.ig.emergencySent);
    assert.deepEqual(sent.action, { kind: "emergency", emergencyKind: "FITS" });
  });

  it("a bad language number ends the session", () => {
    for (const text of ["2*0", "2*6", "2*x", "2*1x"]) {
      const r = ussdMenu(text, mother());
      assert.equal(r.type, "END", text);
      assert.equal(r.action, undefined, text);
      assert.match(r.text, /Wrong choice/, text);
    }
  });
});

describe("mother: main menu and emergency", () => {
  it("shows the main menu after Continue", () => {
    const r = ussdMenu(go(), mother());
    assert.equal(r.type, "CON");
    assert.match(r.text, /Emergency/);
    assert.match(r.text, /symptoms/);
    assert.match(r.text, /next visit/);
  });

  it("option 1 asks what is happening", () => {
    const r = ussdMenu(go("1"), mother());
    assert.equal(r.type, "CON");
    assert.match(r.text, /Bleeding/);
  });

  it("each emergency choice ends the session with the right action", () => {
    const kinds = ["BLEEDING", "LABOUR", "FITS", "BABY", "OTHER"];
    kinds.forEach((kind, i) => {
      const r = ussdMenu(go(`1*${i + 1}`), mother());
      assert.equal(r.type, "END");
      assert.deepEqual(r.action, { kind: "emergency", emergencyKind: kind });
      assert.match(r.text, /Help is being sent/);
    });
  });

  it("a wrong choice ends the session without an action", () => {
    for (const text of ["1*9", "1*0", "1*x", "1*1*1", "9"].map((t) => go(t))) {
      const r = ussdMenu(text, mother());
      assert.equal(r.type, "END", text);
      assert.equal(r.action, undefined, text);
      assert.match(r.text, /Wrong choice/, text);
    }
  });
});

describe("mother: symptom check", () => {
  it("asks about bleeding first", () => {
    const r = ussdMenu(go("2"), mother());
    assert.equal(r.type, "CON");
    assert.match(r.text, /vaginal bleeding/);
  });

  it("stops at once for bleeding", () => {
    const r = ussdMenu(go("2*1"), mother());
    assert.equal(r.type, "END");
    assert.deepEqual(r.action, {
      kind: "symptoms",
      answers: { bleeding: true },
      result: "GO_NOW",
    });
    assert.match(r.text, /Go to the clinic now/);
  });

  it("stops at once for fits", () => {
    const r = ussdMenu(go("2*2*1"), mother());
    assert.equal(r.type, "END");
    assert.equal(r.action?.kind === "symptoms" && r.action.result, "GO_NOW");
  });

  it("asks all eight questions when she answers no to everything, then says OK", () => {
    for (let n = 1; n < 8; n++) {
      const r = ussdMenu(go(["2", ...Array(n).fill("2")].join("*")), mother());
      assert.equal(r.type, "CON", `after ${n} answers`);
      assert.equal(r.text, USSD_TEXTS.en.question[USSD_SYMPTOM_ORDER[n]]);
    }
    const done = ussdMenu(go(["2", ...Array(8).fill("2")].join("*")), mother());
    assert.equal(done.type, "END");
    assert.equal(done.action?.kind === "symptoms" && done.action.result, "OK");
    assert.match(done.text, /no danger signs/);
  });

  it("one other sign means clinic soon", () => {
    // no to bleeding and fits, yes to headache, no to the rest
    const r = ussdMenu(go("2*2*2*1*2*2*2*2*2"), mother());
    assert.equal(r.type, "END");
    assert.equal(r.action?.kind === "symptoms" && r.action.result, "CLINIC_SOON");
  });

  it("two signs mean go now, and it stops right there", () => {
    const r = ussdMenu(go("2*2*2*1*1"), mother()); // headache yes, vision yes
    assert.equal(r.type, "END");
    assert.equal(r.action?.kind === "symptoms" && r.action.result, "GO_NOW");
  });

  it("rejects answers other than 1 or 2, and extra answers after the end", () => {
    assert.match(ussdMenu(go("2*3"), mother()).text, /Wrong choice/);
    assert.match(ussdMenu(go("2*1*2"), mother()).text, /Wrong choice/);
    assert.match(
      ussdMenu(go(["2", ...Array(9).fill("2")].join("*")), mother()).text,
      /Wrong choice/,
    );
  });

  it("every sign the USSD asks about is a known symptom sign", () => {
    assert.deepEqual([...USSD_SYMPTOM_ORDER].sort(), [...SYMPTOM_SIGNS].sort());
  });
});

describe("mother: next visit", () => {
  it("shows the date and contact", () => {
    const r = ussdMenu(go("3"), mother());
    assert.equal(r.type, "END");
    assert.equal(r.text, "Your next visit is Fri 4 Dec (visit 5 of 8). Please come.");
  });

  it("says so when there is none", () => {
    assert.match(ussdMenu(go("3"), mother({ nextVisit: null })).text, /no visit planned/);
  });
});

describe("family contact", () => {
  const family = (lang: "en" | "ig" | "ha" = "en"): UssdContext => ({
    actor: "family",
    lang,
    motherName: "Funmilayo Adeyemi",
  });

  it("only offers an emergency, for her, after Continue", () => {
    const r = ussdMenu(go(), family());
    assert.equal(r.type, "CON");
    assert.match(r.text, /For Funmilayo Adeyemi/);
    assert.doesNotMatch(r.text, /symptoms/);
  });

  it("raises an emergency and names the mother", () => {
    const r = ussdMenu(go("1*3"), family());
    assert.equal(r.type, "END");
    assert.deepEqual(r.action, { kind: "emergency", emergencyKind: "FITS" });
    assert.match(r.text, /Funmilayo Adeyemi/);
  });

  it("does not offer her symptom check or visits", () => {
    assert.match(ussdMenu(go("2"), family()).text, /Wrong choice/);
    assert.match(ussdMenu(go("3"), family()).text, /Wrong choice/);
  });

  it("can choose their own language, which is used for the whole session", () => {
    // The mother uses Igbo; her husband picks Hausa (2*5) and then raises an emergency.
    const menu = ussdMenu("2*5", family("ig"));
    assert.equal(menu.type, "CON");
    assert.equal(
      menu.text,
      fill(USSD_TEXTS.ha.familyMain, { name: "Funmilayo Adeyemi" }),
    );

    const done = ussdMenu("2*5*1*1", family("ig"));
    assert.equal(done.type, "END");
    assert.equal(
      done.text,
      fill(USSD_TEXTS.ha.familyEmergencySent, { name: "Funmilayo Adeyemi" }),
    );
    assert.deepEqual(done.action, { kind: "emergency", emergencyKind: "BLEEDING" });
  });

  it("continuing keeps the mother's language", () => {
    const r = ussdMenu("1", family("ig"));
    assert.equal(r.text, fill(USSD_TEXTS.ig.familyMain, { name: "Funmilayo Adeyemi" }));
  });
});

describe("unknown caller", () => {
  const unknown = (typedMother?: { name: string } | null): UssdContext => ({
    actor: "unknown",
    lang: "en",
    typedMother,
  });

  it("has no welcome or language screen, and can only help a mother by her phone number", () => {
    assert.match(ussdMenu("", unknown()).text, /Help a mother/);
    assert.match(ussdMenu("1", unknown()).text, /Enter the mother's phone number/);
  });

  it("is told when the number is not a registered mother", () => {
    const r = ussdMenu("1*08031234567", unknown(null));
    assert.equal(r.type, "END");
    assert.match(r.text, /could not find that mother/);
  });

  it("goes on to the emergency choices for a registered mother, and carries the typed number", () => {
    const ask = ussdMenu("1*08031234567", unknown({ name: "Zainab Musa" }));
    assert.equal(ask.type, "CON");
    const done = ussdMenu("1*08031234567*1", unknown({ name: "Zainab Musa" }));
    assert.equal(done.type, "END");
    assert.deepEqual(done.action, {
      kind: "emergency",
      emergencyKind: "BLEEDING",
      typedPhone: "08031234567",
    });
    assert.match(done.text, /Zainab Musa/);
  });

  it("learns nothing about mothers: no symptoms, visits or names before the lookup", () => {
    assert.match(ussdMenu("2", unknown()).text, /not registered/);
    assert.match(ussdMenu("3", unknown()).text, /not registered/);
  });
});

describe("texts in every language", () => {
  // Africa's Talking USSD screens are limited to about 182 characters.
  const LIMIT = 182;

  it("every language has every screen, within the length limit", () => {
    for (const lang of LANGS) {
      const t = USSD_TEXTS[lang];
      const screens: string[] = [
        welcomeScreen(lang),
        languageScreen(lang),
        t.main,
        fill(t.familyMain, { name: "Funmilayo Adeyemi" }),
        t.emergencyAsk,
        t.emergencySent,
        fill(t.familyEmergencySent, { name: "Funmilayo Adeyemi" }),
        ...USSD_SYMPTOM_ORDER.map((s) => t.question[s]),
        t.resultOk,
        t.resultSoon,
        t.resultNow,
        fill(t.nextVisit, { date: "Wed 25 Nov", n: 8 }),
        t.noVisit,
        t.wrong,
        t.unknownMenu,
        t.unknownEnd,
        t.familyAskPhone,
        t.familyNotFound,
        t.actionFailed,
        t.smsConfirmed,
        t.smsHelp,
      ];
      for (const screen of screens) {
        assert.ok(screen.length > 0, `${lang}: empty screen`);
        assert.ok(screen.length <= LIMIT, `${lang}: ${screen.length} chars: ${screen}`);
      }
    }
  });

  it("every language keeps the numbered choices the menu relies on", () => {
    for (const lang of LANGS) {
      const t = USSD_TEXTS[lang];
      for (const n of ["1.", "2.", "3.", "4.", "5."]) {
        assert.ok(t.emergencyAsk.includes(n), `${lang} ${n}`);
      }
      for (const n of ["1.", "2.", "3."])
        assert.ok(t.main.includes(n), `${lang} main ${n}`);
      for (const n of ["1.", "2."]) {
        assert.ok(welcomeScreen(lang).includes(n), `${lang} welcome ${n}`);
      }
      for (const n of ["1.", "2.", "3.", "4.", "5."]) {
        assert.ok(languageScreen(lang).includes(n), `${lang} language ${n}`);
      }
      for (const s of USSD_SYMPTOM_ORDER) {
        assert.ok(
          t.question[s].includes("1.") && t.question[s].includes("2."),
          `${lang} ${s}`,
        );
      }
    }
  });

  it("the whole menu works in every language", () => {
    for (const lang of LANGS) {
      const ctx = mother({ lang });
      assert.equal(ussdMenu("", ctx).text, welcomeScreen(lang));
      assert.equal(ussdMenu("1", ctx).text, USSD_TEXTS[lang].main);
      assert.equal(ussdMenu("1*1", ctx).text, USSD_TEXTS[lang].emergencyAsk);
      assert.equal(ussdMenu("1*1*2", ctx).text, USSD_TEXTS[lang].emergencySent);
    }
  });
});
