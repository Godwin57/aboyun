import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ancSchedule,
  dateAtWeek,
  eddFromLmp,
  gestationalAge,
  isOverdue,
  nearestContactNo,
} from "./schedule";

const iso = (d: Date) => d.toISOString().slice(0, 10);
// The example used in the design: last period on 10 April 2026.
const LMP = new Date("2026-04-10T00:00:00Z");

describe("eddFromLmp", () => {
  it("is 280 days after the last period", () => {
    assert.equal(iso(eddFromLmp(LMP)), "2027-01-15");
    assert.equal(iso(eddFromLmp(new Date("2026-09-01T00:00:00Z"))), "2027-06-08");
  });

  it("ignores the time of day", () => {
    assert.equal(iso(eddFromLmp(new Date("2026-04-10T23:30:00Z"))), "2027-01-15");
  });
});

describe("gestationalAge", () => {
  it("counts weeks and days", () => {
    const age = gestationalAge(LMP, new Date("2026-11-13T00:00:00Z"));
    assert.deepEqual(age, { weeks: 31, days: 0, totalDays: 217 });
  });

  it("handles a part week", () => {
    const age = gestationalAge(
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-11-13T00:00:00Z"),
    );
    assert.equal(age.weeks, 10);
    assert.equal(age.days, 3);
  });

  it("is negative before the last period", () => {
    assert.equal(gestationalAge(LMP, new Date("2026-04-01T00:00:00Z")).totalDays, -9);
  });
});

describe("ancSchedule", () => {
  const schedule = ancSchedule(LMP);

  it("has the eight WHO contacts at weeks 12, 20, 26, 30, 34, 36, 38, 40", () => {
    assert.deepEqual(
      schedule.map((c) => c.week),
      [12, 20, 26, 30, 34, 36, 38, 40],
    );
    assert.deepEqual(
      schedule.map((c) => c.contactNo),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
  });

  it("matches the dates in the design", () => {
    assert.deepEqual(
      schedule.map((c) => iso(c.dueDate)),
      [
        "2026-07-03",
        "2026-08-28",
        "2026-10-09",
        "2026-11-06",
        "2026-12-04",
        "2026-12-18",
        "2027-01-01",
        "2027-01-15",
      ],
    );
  });

  it("puts contact 8 on the due date", () => {
    assert.equal(iso(schedule[7].dueDate), iso(eddFromLmp(LMP)));
  });
});

describe("dateAtWeek", () => {
  it("adds whole weeks", () => {
    assert.equal(iso(dateAtWeek(LMP, 12)), "2026-07-03");
  });
});

describe("nearestContactNo", () => {
  it("picks the closest planned week", () => {
    assert.equal(nearestContactNo(LMP, new Date("2026-07-03T00:00:00Z")), 1);
    assert.equal(nearestContactNo(LMP, new Date("2026-12-04T00:00:00Z")), 5);
    assert.equal(nearestContactNo(LMP, new Date("2027-01-20T00:00:00Z")), 8);
  });
});

describe("isOverdue", () => {
  const today = new Date("2026-11-13T09:00:00Z");

  it("is overdue when due before today and not attended", () => {
    assert.equal(isOverdue(new Date("2026-11-06T00:00:00Z"), null, today), true);
  });

  it("is not overdue when due today or later", () => {
    assert.equal(isOverdue(new Date("2026-11-13T00:00:00Z"), null, today), false);
    assert.equal(isOverdue(new Date("2026-11-20T00:00:00Z"), null, today), false);
  });

  it("is not overdue once attended", () => {
    assert.equal(
      isOverdue(
        new Date("2026-11-06T00:00:00Z"),
        new Date("2026-11-06T10:00:00Z"),
        today,
      ),
      false,
    );
  });
});
