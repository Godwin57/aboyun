import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSmsCommand } from "./sms-commands";

describe("parseSmsCommand", () => {
  it("1 confirms a reminder", () => {
    assert.deepEqual(parseSmsCommand("1"), { kind: "confirm" });
    assert.deepEqual(parseSmsCommand("  1  "), { kind: "confirm" });
    assert.deepEqual(parseSmsCommand("1."), { kind: "confirm" });
  });

  it("E on its own is a general emergency", () => {
    for (const text of ["E", "e", "HELP", "help", "SOS", "Emergency"]) {
      assert.deepEqual(
        parseSmsCommand(text),
        { kind: "emergency", emergencyKind: "OTHER" },
        text,
      );
    }
  });

  it("E with a kind picks that kind, whatever the case or punctuation", () => {
    const cases: [string, string][] = [
      ["E BLEEDING", "BLEEDING"],
      ["e b", "BLEEDING"],
      ["E labour", "LABOUR"],
      ["E L", "LABOUR"],
      ["E, labor!", "LABOUR"],
      ["E FITS", "FITS"],
      ["E f", "FITS"],
      ["E BABY", "BABY"],
      ["E C", "BABY"],
      ["HELP BLEEDING", "BLEEDING"],
      ["E OTHER", "OTHER"],
    ];
    for (const [text, kind] of cases) {
      assert.deepEqual(
        parseSmsCommand(text),
        { kind: "emergency", emergencyKind: kind },
        text,
      );
    }
  });

  it("E with something it does not know is still an emergency", () => {
    assert.deepEqual(parseSmsCommand("E PAIN"), {
      kind: "emergency",
      emergencyKind: "OTHER",
    });
  });

  it("everything else is unknown", () => {
    for (const text of [
      "",
      "   ",
      "hello",
      "2",
      "11",
      "thanks for the reminder",
      "E B L O W",
    ]) {
      assert.deepEqual(parseSmsCommand(text), { kind: "unknown" }, JSON.stringify(text));
    }
  });
});
