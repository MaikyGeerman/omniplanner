// Quick sanity check: npx tsx src/lib/scheduler.test.ts
import assert from "node:assert";
import { DateTime } from "luxon";
import { suggestSlots } from "./scheduler";

const tz = "Europe/Amsterdam";
const now = DateTime.fromISO("2026-11-23T09:00", { zone: tz }).toJSDate(); // a Monday
const at = (iso: string) => DateTime.fromISO(iso, { zone: tz }).toMillis();

// Anna is busy every evening except Wednesday; Bram is busy Wednesday 18:00-19:30.
const annaBusy = [23, 24, 26, 27, 28, 29].map((d) => ({
  start: at(`2026-11-${d}T17:00`),
  end: at(`2026-11-${d}T23:59`),
}));
const slots = suggestSlots({
  participants: [
    { id: "anna", name: "Anna", weight: 3, busy: annaBusy },
    { id: "bram", name: "Bram", weight: 3, busy: [{ start: at("2026-11-25T18:00"), end: at("2026-11-25T19:30") }] },
  ],
  shape: "evening",
  durationMin: 180,
  minPeople: 2,
  horizonDays: 7,
  timezone: tz,
  now,
});

assert.equal(slots.length, 1, "only Wednesday works for both");
const start = DateTime.fromJSDate(slots[0].start).setZone(tz);
assert.equal(start.toISODate(), "2026-11-25");
assert.equal(start.toFormat("HH:mm"), "19:30", "starts right after Bram is free");
assert.equal(
  DateTime.fromJSDate(suggestSlots({ participants: [{ id: "x", name: "X", weight: 3, busy: [] }], shape: "evening", durationMin: 120, minPeople: 1, horizonDays: 3, timezone: tz, now })[0].start).setZone(tz).toFormat("HH:mm"),
  "19:00",
  "free evening -> natural 19:00 start",
);

const weekend = suggestSlots({
  participants: [{ id: "anna", name: "Anna", weight: 3, busy: [] }],
  shape: "weekend",
  durationMin: 0,
  minPeople: 1,
  horizonDays: 14,
  timezone: tz,
  now,
});
assert.equal(weekend.length, 2, "two weekends in 14 days");
console.log("scheduler tests passed");
