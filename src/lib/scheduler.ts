import { DateTime } from "luxon";
import type { Interval } from "@/lib/google";

export type Shape = "evening" | "daytime" | "anytime" | "weekend";
export const SHAPES: Shape[] = ["evening", "daytime", "anytime", "weekend"];

export type Participant = {
  id: string;
  name: string;
  // "in" counts most, "maybe" and not-yet-voted count less, "out" is excluded upstream
  weight: number;
  busy: Interval[] | null; // null = calendar unknown
};

export type Slot = {
  start: Date;
  end: Date;
  free: string[]; // participant ids
  busy: string[];
  unknown: string[];
  score: number;
};

const STEP_MIN = 30;

/** Windows (in local time) in which an activity of this shape may START, and the latest it may END. */
function dayWindow(shape: Exclude<Shape, "weekend">) {
  switch (shape) {
    case "evening":
      return { firstStart: 18 * 60, lastStart: 20 * 60, latestEnd: 24 * 60, preferred: 19 * 60 };
    case "daytime":
      return { firstStart: 9 * 60, lastStart: 15 * 60, latestEnd: 18 * 60, preferred: 12 * 60 };
    case "anytime":
      return { firstStart: 10 * 60, lastStart: 20 * 60, latestEnd: 23 * 60, preferred: 18 * 60 };
  }
}

function overlaps(busy: Interval[], start: number, end: number) {
  return busy.some((b) => b.start < end && b.end > start);
}

function evaluate(participants: Participant[], start: DateTime, end: DateTime): Slot {
  const s = start.toMillis();
  const e = end.toMillis();
  const slot: Slot = { start: start.toJSDate(), end: end.toJSDate(), free: [], busy: [], unknown: [], score: 0 };
  for (const p of participants) {
    if (p.busy === null) slot.unknown.push(p.id);
    else if (overlaps(p.busy, s, e)) slot.busy.push(p.id);
    else {
      slot.free.push(p.id);
      slot.score += p.weight;
    }
  }
  return slot;
}

/** Candidate (start, end) pairs, grouped so we keep at most one suggestion per day / weekend. */
function* candidateGroups(
  shape: Shape,
  durationMin: number,
  from: DateTime,
  to: DateTime,
): Generator<DateTime[][]> {
  let day = from.startOf("day");
  while (day < to) {
    if (shape === "weekend") {
      if (day.weekday === 6) {
        // Saturday 10:00 -> Sunday 18:00
        yield [[day.set({ hour: 10 }), day.plus({ days: 1 }).set({ hour: 18 })]];
      }
    } else {
      const w = dayWindow(shape);
      const options: DateTime[][] = [];
      // Try the most natural start time first; since ties keep the first option, it wins when possible.
      for (let m = w.firstStart; m <= w.lastStart; m += STEP_MIN) {
        if (m + durationMin > w.latestEnd) break;
        const start = day.plus({ minutes: m });
        options.push([start, start.plus({ minutes: durationMin })]);
      }
      const mid = (o: DateTime[]) => Math.abs(o[0].diff(day, "minutes").minutes - w.preferred);
      options.sort((a, b) => mid(a) - mid(b));
      if (options.length) yield options;
    }
    day = day.plus({ days: 1 });
  }
}

export function suggestSlots(opts: {
  participants: Participant[];
  shape: Shape;
  durationMin: number;
  minPeople: number;
  horizonDays: number;
  timezone: string;
  now?: Date;
  limit?: number;
}): Slot[] {
  const { participants, shape, durationMin, minPeople, horizonDays, timezone } = opts;
  const now = DateTime.fromJSDate(opts.now ?? new Date()).setZone(timezone);
  const earliest = now.plus({ hours: 2 });
  const to = now.plus({ days: horizonDays });

  const best: Slot[] = [];
  for (const group of candidateGroups(shape, durationMin, now, to)) {
    let pick: Slot | null = null;
    for (const [start, end] of group) {
      if (start < earliest || end > to) continue;
      const slot = evaluate(participants, start, end);
      // prefer more free people; on a tie keep the earlier start
      if (!pick || slot.score > pick.score) pick = slot;
    }
    if (!pick || pick.free.length < minPeople) continue;

    // Who's free matters most. Then: sooner is a bit better, and Fri/Sat (or Sunday daytime)
    // get a small bonus because that's when people like to go out.
    const start = DateTime.fromJSDate(pick.start).setZone(timezone);
    const wd = start.weekday;
    if (shape !== "weekend" && (wd === 5 || wd === 6 || (wd === 7 && shape !== "evening"))) {
      pick.score += 0.25;
    }
    pick.score -= 0.04 * start.diff(now, "days").days;
    best.push(pick);
  }

  return best
    .sort((a, b) => b.score - a.score || a.start.getTime() - b.start.getTime())
    .slice(0, opts.limit ?? 5);
}

/** Best slot first is what suggestSlots returns; this is handy for showing the rest by date. */
export function byDate(slots: Slot[]) {
  return [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
}
