import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SYMPTOM_SIGNS } from "./symptoms";
import { parseUssdInput, ussdMenu, type UssdContext } from "./ussd-menu";
import { fill, LANGS, USSD_SYMPTOM_ORDER, USSD_TEXTS } from "./ussd-texts";

const mother = (
  over: Partial<Extract<UssdContext, { actor: "mother" }>> = {},
): UssdContext => ({
  actor: "mother",
  lang: "en",
  nextVisit: { dateText: "Fri 4 Dec", contactNo: 5 },
  ...over,
});

describe("parseUssdInput", () => {
  it("splits what has been typed so far", () => {
    assert.deepEqual(parseUssdInput(""), []);
    assert.deepEqual(parseUssdInput("1"), ["1"]);
    assert.deepEqual(parseUssdInput("2*2*1"), ["2", "2", "1"]);
  });
});

describe("mother: main menu and emergency", () => {
  it("shows the main menu first and keeps the session open", () => {
    const r = ussdMenu("", mother());
    assert.equal(r.type, "CON");
    assert.match(r.text, /Emergency/);
    assert.match(r.text, /symptoms/);
    assert.match(r.text, /next visit/);
  });

  it("option 1 asks what is happening", () => {
    const r = ussdMenu("1", mother());
    assert.equal(r.type, "CON");
    assert.match(r.text, /Bleeding/);
  });

  it("each emergency choice ends the session with the right action", () => {
    const kinds = ["BLEEDING", "LABOUR", "FITS", "BABY", "OTHER"];
    kinds.forEach((kind, i) => {
      const r = ussdMenu(`1*${i + 1}`, mother());
      assert.equal(r.type, "END");
      assert.deepEqual(r.action, { kind: "emergency", emergencyKind: kind });
      assert.match(r.text, /Help is being sent/);
    });
  });

  it("a wrong choice ends the session without an action", () => {
    for (const text of ["1*9", "1*0", "1*x", "1*1*1", "9"]) {
      const r = ussdMenu(text, mother());
      assert.equal(r.type, "END", text);
      assert.equal(r.action, undefined, text);
      assert.match(r.text, /Wrong choice/, text);
    }
  });
});

describe("mother: symptom check", () => {
  it("asks about bleeding first", () => {
    const r = ussdMenu("2", mother());
    assert.equal(r.type, "CON");
    assert.match(r.text, /vaginal bleeding/);
  });

  it("stops at once for bleeding", () => {
    const r = ussdMenu("2*1", mother());
    assert.equal(r.type, "END");
    assert.deepEqual(r.action, {
      kind: "symptoms",
      answers: { bleeding: true },
      result: "GO_NOW",
    });
    assert.match(r.text, /Go to the clinic now/);
  });

  it("stops at once for fits", () => {
    const r = ussdMenu("2*2*1", mother());
    assert.equal(r.type, "END");
    assert.equal(r.action?.kind === "symptoms" && r.action.result, "GO_NOW");
  });

  it("asks all eight questions when she answers no to everything, then says OK", () => {
    for (let n = 1; n < 8; n++) {
      const r = ussdMenu(["2", ...Array(n).fill("2")].join("*"), mother());
      assert.equal(r.type, "CON", `after ${n} answers`);
      assert.equal(r.text, USSD_TEXTS.en.question[USSD_SYMPTOM_ORDER[n]]);
    }
    const done = ussdMenu(["2", ...Array(8).fill("2")].join("*"), mother());
    assert.equal(done.type, "END");
    assert.equal(done.action?.kind === "symptoms" && done.action.result, "OK");
    assert.match(done.text, /no danger signs/);
  });

  it("one other sign means clinic soon", () => {
    // no to bleeding and fits, yes to headache, no to the rest
    const r = ussdMenu("2*2*2*1*2*2*2*2*2", mother());
    assert.equal(r.type, "END");
    assert.equal(r.action?.kind === "symptoms" && r.action.result, "CLINIC_SOON");
  });

  it("two signs mean go now, and it stops right there", () => {
    const r = ussdMenu("2*2*2*1*1", mother()); // headache yes, vision yes
    assert.equal(r.type, "END");
    assert.equal(r.action?.kind === "symptoms" && r.action.result, "GO_NOW");
  });

  it("rejects answers other than 1 or 2, and extra answers after the end", () => {
    assert.match(ussdMenu("2*3", mother()).text, /Wrong choice/);
    assert.match(ussdMenu("2*1*2", mother()).text, /Wrong choice/);
    assert.match(
      ussdMenu(["2", ...Array(9).fill("2")].join("*"), mother()).text,
      /Wrong choice/,
    );
  });

  it("every sign the USSD asks about is a known symptom sign", () => {
    assert.deepEqual([...USSD_SYMPTOM_ORDER].sort(), [...SYMPTOM_SIGNS].sort());
  });
});

describe("mother: next visit", () => {
  it("shows the date and contact", () => {
    const r = ussdMenu("3", mother());
    assert.equal(r.type, "END");
    assert.equal(r.text, "Your next visit is Fri 4 Dec (visit 5 of 8). Please come.");
  });

  it("says so when there is none", () => {
    assert.match(ussdMenu("3", mother({ nextVisit: null })).text, /no visit planned/);
  });
});

describe("family contact", () => {
  const family: UssdContext = {
    actor: "family",
    lang: "en",
    motherName: "Funmilayo Adeyemi",
  };

  it("only offers an emergency, for her", () => {
    const r = ussdMenu("", family);
    assert.equal(r.type, "CON");
    assert.match(r.text, /For Funmilayo Adeyemi/);
    assert.doesNotMatch(r.text, /symptoms/);
  });

  it("raises an emergency and names the mother", () => {
    const r = ussdMenu("1*3", family);
    assert.equal(r.type, "END");
    assert.deepEqual(r.action, { kind: "emergency", emergencyKind: "FITS" });
    assert.match(r.text, /Funmilayo Adeyemi/);
  });

  it("does not offer her symptom check or visits", () => {
    assert.match(ussdMenu("2", family).text, /Wrong choice/);
    assert.match(ussdMenu("3", family).text, /Wrong choice/);
  });
});

describe("unknown caller", () => {
  const unknown = (typedMother?: { name: string } | null): UssdContext => ({
    actor: "unknown",
    lang: "en",
    typedMother,
  });

  it("can only help a mother by her phone number", () => {
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
      for (const n of ["1.", "2.", "3.", "4.", "5."])
        assert.ok(t.emergencyAsk.includes(n), `${lang} ${n}`);
      for (const n of ["1.", "2.", "3."])
        assert.ok(t.main.includes(n), `${lang} main ${n}`);
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
      assert.equal(ussdMenu("", ctx).text, USSD_TEXTS[lang].main);
      assert.equal(ussdMenu("1", ctx).text, USSD_TEXTS[lang].emergencyAsk);
      assert.equal(ussdMenu("1*2", ctx).text, USSD_TEXTS[lang].emergencySent);
    }
  });
});
