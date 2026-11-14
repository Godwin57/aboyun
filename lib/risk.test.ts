import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessVisit,
  highestLevel,
  isReferCode,
  overallRisk,
  type DangerSign,
} from "./risk";

const codes = (r: ReturnType<typeof assessVisit>) => r.reasons.map((x) => x.code);

describe("blood pressure", () => {
  it("159/109 is high but not refer-now", () => {
    const r = assessVisit({ bpSys: 159, bpDia: 109 });
    assert.equal(r.level, "HIGH");
    assert.equal(r.refer, false);
    assert.deepEqual(codes(r), ["BP_HIGH"]);
  });

  it("160 on top is severe: high and refer now", () => {
    const r = assessVisit({ bpSys: 160, bpDia: 80 });
    assert.equal(r.level, "HIGH");
    assert.equal(r.refer, true);
    assert.deepEqual(codes(r), ["BP_SEVERE"]);
  });

  it("110 on the bottom is severe even if the top is normal", () => {
    const r = assessVisit({ bpSys: 120, bpDia: 110 });
    assert.equal(r.refer, true);
    assert.deepEqual(codes(r), ["BP_SEVERE"]);
  });

  it("140/90 is the high boundary", () => {
    assert.equal(assessVisit({ bpSys: 140, bpDia: 80 }).level, "HIGH");
    assert.equal(assessVisit({ bpSys: 120, bpDia: 90 }).level, "HIGH");
    assert.equal(assessVisit({ bpSys: 139, bpDia: 89 }).level, "LOW");
  });

  it("reports only the severe flag, not both", () => {
    assert.deepEqual(codes(assessVisit({ bpSys: 168, bpDia: 112 })), ["BP_SEVERE"]);
  });

  it("the demo mother's 168/112 reads as refer now", () => {
    const r = assessVisit({ bpSys: 168, bpDia: 112 });
    assert.equal(r.reasons[0].text, "Severe high blood pressure (168/112)");
  });
});

describe("haemoglobin", () => {
  it("under 7 is high and refer now", () => {
    const r = assessVisit({ hbGdl: 6.9 });
    assert.equal(r.level, "HIGH");
    assert.equal(r.refer, true);
    assert.deepEqual(codes(r), ["HB_SEVERE"]);
  });

  it("7 up to 10.9 is medium", () => {
    for (const hb of [7, 9.4, 10.2, 10.9]) {
      const r = assessVisit({ hbGdl: hb });
      assert.equal(r.level, "MEDIUM", `Hb ${hb}`);
      assert.equal(r.refer, false);
    }
  });

  it("11 or more is fine", () => {
    assert.equal(assessVisit({ hbGdl: 11 }).level, "LOW");
    assert.equal(assessVisit({ hbGdl: 12.4 }).level, "LOW");
  });
});

describe("danger signs", () => {
  it("any danger sign is high and refer now", () => {
    const signs: DangerSign[] = [
      "bleeding",
      "headache",
      "vision",
      "fits",
      "movement",
      "fever",
      "swelling",
      "pain",
    ];
    for (const sign of signs) {
      const r = assessVisit({ signs: { [sign]: true } });
      assert.equal(r.level, "HIGH", sign);
      assert.equal(r.refer, true, sign);
      assert.deepEqual(codes(r), [`SIGN_${sign.toUpperCase()}`]);
    }
  });

  it("an unticked sign counts for nothing", () => {
    assert.equal(assessVisit({ signs: { fits: false } }).level, "LOW");
  });
});

describe("combining and empty input", () => {
  it("takes the most serious level", () => {
    const r = assessVisit({ bpSys: 150, bpDia: 95, hbGdl: 10.2 });
    assert.equal(r.level, "HIGH");
    assert.deepEqual(codes(r), ["BP_HIGH", "HB_LOW"]);
  });

  it("medium when only the Hb is low", () => {
    assert.equal(assessVisit({ bpSys: 118, bpDia: 74, hbGdl: 10.6 }).level, "MEDIUM");
  });

  it("nothing entered is low with no reasons", () => {
    const r = assessVisit({});
    assert.equal(r.level, "LOW");
    assert.equal(r.refer, false);
    assert.deepEqual(r.reasons, []);
  });

  it("ignores missing and non-numeric values", () => {
    const r = assessVisit({ bpSys: null, bpDia: undefined, hbGdl: Number.NaN });
    assert.equal(r.level, "LOW");
  });
});

describe("overall risk from open flags", () => {
  it("is the highest open level", () => {
    assert.equal(
      overallRisk([
        { level: "MEDIUM", resolvedAt: null },
        { level: "HIGH", resolvedAt: null },
      ]),
      "HIGH",
    );
  });

  it("drops when the high flag is resolved", () => {
    assert.equal(
      overallRisk([
        { level: "HIGH", resolvedAt: new Date() },
        { level: "MEDIUM", resolvedAt: null },
      ]),
      "MEDIUM",
    );
  });

  it("is low with no open flags", () => {
    assert.equal(overallRisk([]), "LOW");
    assert.equal(highestLevel([]), "LOW");
  });
});

describe("isReferCode", () => {
  it("is true for the refer-now rules", () => {
    for (const code of ["BP_SEVERE", "HB_SEVERE", "SIGN_FITS", "SIGN_BLEEDING"]) {
      assert.equal(isReferCode(code), true, code);
    }
  });

  it("is false for the rest", () => {
    for (const code of ["BP_HIGH", "HB_LOW", "", null, undefined]) {
      assert.equal(isReferCode(code), false, String(code));
    }
  });

  it("agrees with the refer flag from assessVisit", () => {
    const cases = [
      { bpSys: 168, bpDia: 112 },
      { bpSys: 150, bpDia: 95 },
      { hbGdl: 6.5 },
      { hbGdl: 10 },
      { signs: { vision: true } },
    ];
    for (const readings of cases) {
      const r = assessVisit(readings);
      assert.equal(
        r.refer,
        r.reasons.some((x) => isReferCode(x.code)),
      );
    }
  });
});
