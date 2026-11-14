import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessSymptoms,
  reportedSigns,
  SYMPTOM_SIGNS,
  type SymptomSign,
} from "./symptoms";

describe("assessSymptoms", () => {
  it("no signs is OK", () => {
    assert.equal(assessSymptoms({}), "OK");
    assert.equal(assessSymptoms({ fever: false, pain: false }), "OK");
  });

  it("bleeding or fits alone means go now", () => {
    assert.equal(assessSymptoms({ bleeding: true }), "GO_NOW");
    assert.equal(assessSymptoms({ fits: true }), "GO_NOW");
  });

  it("one other sign means clinic soon", () => {
    const others = SYMPTOM_SIGNS.filter((s) => s !== "bleeding" && s !== "fits");
    for (const sign of others) {
      assert.equal(assessSymptoms({ [sign]: true }), "CLINIC_SOON", sign);
    }
  });

  it("two or more signs mean go now", () => {
    assert.equal(assessSymptoms({ headache: true, vision: true }), "GO_NOW");
    assert.equal(assessSymptoms({ fever: true, swelling: true, pain: true }), "GO_NOW");
  });
});

describe("reportedSigns", () => {
  it("lists only the signs answered yes, in a fixed order", () => {
    const signs: SymptomSign[] = reportedSigns({
      pain: true,
      bleeding: true,
      fever: false,
    });
    assert.deepEqual(signs, ["bleeding", "pain"]);
  });
});
