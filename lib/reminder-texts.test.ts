import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMissed, matchVisit, selectDue } from "./reminder-rules";
import { firstName, visitReminderText } from "./reminder-texts";

const D = (s: string) => new Date(`${s}T00:00:00Z`);

describe("visitReminderText", () => {
  for (const language of ["en", "pcm", "yo", "ig", "ha"]) {
    it(`${language}: name, date, facility and reply 1`, () => {
      const { text } = visitReminderText({
        language,
        name: "Amina Bello",
        date: "Fri 4 Dec",
        facility: "Wuse PHC",
      });
      assert.match(text, /Amina/);
      assert.doesNotMatch(text, /Bello/);
      assert.match(text, /Fri 4 Dec/);
      assert.match(text, /Wuse PHC/);
      assert.match(text, /\b1\b/);
      assert.ok(text.length <= 190, `${language} is ${text.length} chars`);
    });
  }
  it("falls back to English for an unknown language", () => {
    const en = visitReminderText({ language: "en", name: "A", date: "d", facility: "f" });
    const xx = visitReminderText({ language: "xx", name: "A", date: "d", facility: "f" });
    assert.equal(xx.text, en.text);
  });
  it("firstName", () => {
    assert.equal(firstName("  Ngozi  Eze "), "Ngozi");
    assert.equal(firstName(""), "Mama");
  });
});

describe("matchVisit", () => {
  const dueAt = D("2026-12-02");
  it("finds the unattended visit two days after dueAt", () => {
    const v = { id: "a", dueDate: D("2026-12-04"), attendedAt: null };
    assert.equal(matchVisit(dueAt, [v]), v);
  });
  it("ignores attended visits and visits outside the window", () => {
    const attended = { id: "a", dueDate: D("2026-12-04"), attendedAt: D("2026-12-03") };
    assert.equal(matchVisit(dueAt, [attended]), null);
    assert.equal(
      matchVisit(dueAt, [{ id: "b", dueDate: D("2026-12-06"), attendedAt: null }]),
      null,
    );
    assert.equal(
      matchVisit(dueAt, [{ id: "c", dueDate: D("2026-12-01"), attendedAt: null }]),
      null,
    );
  });
  it("includes both ends of the window", () => {
    assert.ok(
      matchVisit(dueAt, [{ id: "a", dueDate: D("2026-12-02"), attendedAt: null }]),
    );
    assert.ok(
      matchVisit(dueAt, [{ id: "b", dueDate: D("2026-12-05"), attendedAt: null }]),
    );
  });
});

describe("selectDue", () => {
  const now = D("2026-12-10");
  const r = (id: string, status: string, dueAt: Date) => ({ id, status, dueAt });
  it("keeps PENDING due ones, oldest first, bounded", () => {
    const list = [
      r("late", "PENDING", D("2026-12-09")),
      r("future", "PENDING", D("2026-12-11")),
      r("sent", "SENT", D("2026-12-01")),
      r("old", "PENDING", D("2026-12-01")),
      r("now", "PENDING", now),
    ];
    assert.deepEqual(
      selectDue(list, now, 10).map((x) => x.id),
      ["old", "late", "now"],
    );
    assert.deepEqual(
      selectDue(list, now, 2).map((x) => x.id),
      ["old", "late"],
    );
  });
});

describe("isMissed", () => {
  const now = D("2026-12-10");
  it("only SENT visit reminders more than 4 days past dueAt", () => {
    const m = (kind: string, status: string, dueAt: string) =>
      isMissed({ kind, status, dueAt: D(dueAt) }, now);
    assert.equal(m("VISIT", "SENT", "2026-12-05"), true);
    assert.equal(m("VISIT", "SENT", "2026-12-06"), false);
    assert.equal(m("VISIT", "CONFIRMED", "2026-12-01"), false);
    assert.equal(m("TABLET", "SENT", "2026-12-01"), false);
  });
});
