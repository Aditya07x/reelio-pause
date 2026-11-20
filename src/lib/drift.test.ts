import { describe, expect, it } from "vitest";
import {
  computeDrift,
  COOLDOWN_MS,
  formatInterruption,
  intentFactor,
  isFastSwipe,
  isNight,
  MIN_FEED_MS,
  shouldCheckIn,
  type EntryContext,
} from "./drift";
import { FACTORS, WEIGHT_TOTAL } from "./evidence";
import {
  createSession,
  currentItem,
  sessionReducer,
  type PauseItem,
  type SessionState,
} from "./session";

const MIN = 60_000;
const part = (r: ReturnType<typeof computeDrift>, key: string) =>
  r.parts.find((p) => p.key === key)!.points;

describe("evidence and weights", () => {
  it("weights come from the evidence table and sum to 100", () => {
    expect(WEIGHT_TOTAL).toBe(100);
    const r = computeDrift({ sessionMs: 0, dwellsMs: [], hour: 14 });
    expect(r.parts.map((p) => p.max)).toEqual(FACTORS.map((f) => f.weight));
  });

  it("how the session started outweighs minutes in the feed (intent gap β 0.76 vs duration β 0.18)", () => {
    const intent = FACTORS.find((f) => f.key === "entry")!.weight;
    const time = FACTORS.find((f) => f.key === "time")!.weight;
    expect(intent).toBeGreaterThan(time);
  });
});

describe("individual factors", () => {
  it("a purposeful entry only counts as drift after a minute in the feed", () => {
    expect(intentFactor("dm", 0.5)).toBe(0);
    expect(intentFactor("dm", 2)).toBeCloseTo(0.5);
    expect(intentFactor("dm", 5)).toBe(1);
    expect(intentFactor("home", 0)).toBe(0.6);
  });

  it("night is 9 pm to 7 am", () => {
    expect([21, 23, 0, 6].every((h) => isNight(h))).toBe(true);
    expect([7, 12, 20].some((h) => isNight(h))).toBe(false);
  });

  it("swipes under 2 seconds are fast", () => {
    expect(isFastSwipe(1999)).toBe(true);
    expect(isFastSwipe(2000)).toBe(false);
  });

  it("every factor maps to columns the Android app already logs", () => {
    expect(FACTORS.every((f) => f.reelioColumns.length > 0)).toBe(true);
  });

  it("liking reels lowers the no-interaction factor", () => {
    const dwellsMs = Array(10).fill(4000);
    const passive = computeDrift({
      sessionMs: 5 * MIN,
      dwellsMs,
      engaged: Array(10).fill(false),
      hour: 14,
    });
    const active = computeDrift({
      sessionMs: 5 * MIN,
      dwellsMs,
      engaged: Array(10).fill(true),
      hour: 14,
    });
    expect(part(passive, "interaction")).toBe(15);
    expect(part(active, "interaction")).toBe(0);
  });

  it("lingering on the current reel pulls the skip-rate factor down", () => {
    // Half of these reels were fast swipes: right at full weight.
    const base = {
      sessionMs: 10 * MIN,
      dwellsMs: [800, 4000, 800, 4000, 800, 4000, 800, 4000],
      hour: 14,
    };
    expect(part(computeDrift({ ...base, currentDwellMs: 90_000 }), "skips")).toBeLessThan(
      part(computeDrift(base), "skips"),
    );
  });

  it("time in the feed is zero for the first 2 minutes (typical session ~94 s)", () => {
    expect(part(computeDrift({ sessionMs: 1.5 * MIN, dwellsMs: [], hour: 14 }), "time")).toBe(0);
    expect(part(computeDrift({ sessionMs: 20 * MIN, dwellsMs: [], hour: 14 }), "time")).toBe(15);
  });

  it("lying still in the dark adds a small amount, only when both sensors agree", () => {
    expect(
      part(computeDrift({ sessionMs: 0, dwellsMs: [], hour: 23, stillInDark: true }), "bed"),
    ).toBe(5);
    expect(part(computeDrift({ sessionMs: 0, dwellsMs: [], hour: 23 }), "bed")).toBe(0);
  });

  it("earlier short-video time today adds up to its full weight at 90 min", () => {
    expect(
      part(computeDrift({ sessionMs: 0, dwellsMs: [], hour: 14, dailyMinBefore: 45 }), "load"),
    ).toBe(5);
    expect(
      part(computeDrift({ sessionMs: 0, dwellsMs: [], hour: 14, dailyMinBefore: 200 }), "load"),
    ).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Scenario evals: behaviour patterns described in the literature, run through
// the real reducer. Each asserts what the assumptions say should happen.
// ---------------------------------------------------------------------------

interface Persona {
  entry: EntryContext;
  hour: number;
  dailyMinBefore?: number;
  stillInDark?: boolean;
  /** Time on each reel, by reel number. */
  dwell: (i: number) => number;
  /** Does the person like/save reel i? */
  engages?: (i: number) => boolean;
  minutes: number;
  /** What to do at a pause. */
  onPause?: "keepGoing" | "stop";
}

function run(p: Persona) {
  let s: SessionState = createSession(1, 0, {
    entry: p.entry,
    dailyMinBefore: p.dailyMinBefore ?? 0,
  });
  const pausesAtMin: number[] = [];
  for (let i = 0; s.sessionMs < p.minutes * MIN && i < 5000; i++) {
    const d = p.dwell(i);
    s = sessionReducer(s, { type: "tick", dtMs: d, speed: 1 });
    const cur = currentItem(s);
    if (p.engages?.(i) && cur?.kind === "reel")
      s = sessionReducer(s, { type: "engage", id: cur.id });
    s = sessionReducer(s, { type: "step", dir: 1, dwellMs: d, hour: p.hour });
    if (currentItem(s)?.kind === "pause") {
      pausesAtMin.push((currentItem(s) as PauseItem).sessionMs / MIN);
      if ((p.onPause ?? "stop") === "stop") break;
      s = sessionReducer(s, { type: "keepGoing" });
    }
  }
  return pausesAtMin;
}

const fastBored = (i: number) => (i % 3 === 0 ? 4000 : 1200); // two of three reels rejected in ~1 s

describe("scenario evals", () => {
  it("quick checker (brief, repeated checks): never interrupted", () => {
    expect(run({ entry: "home", hour: 14, dwell: () => 1200, minutes: 2.5 })).toEqual([]);
  });

  it("engaged viewer in bed at night after a long day of scrolling: still not interrupted", () => {
    expect(
      run({
        entry: "home",
        hour: 23,
        stillInDark: true,
        dailyMinBefore: 90,
        dwell: () => 14_000,
        engages: (i) => i % 3 === 0,
        minutes: 30,
      }),
    ).toEqual([]);
  });

  it("engaged viewer watching reels through and liking some: not interrupted in 30 minutes", () => {
    expect(
      run({
        entry: "home",
        hour: 14,
        dwell: () => 14_000,
        engages: (i) => i % 3 === 0,
        minutes: 30,
      }),
    ).toEqual([]);
  });

  it("engaged viewer late at night: still not interrupted (night alone is not enough)", () => {
    expect(
      run({
        entry: "home",
        hour: 23,
        dwell: () => 14_000,
        engages: (i) => i % 3 === 0,
        minutes: 30,
      }),
    ).toEqual([]);
  });

  it("nothing is ever interrupted before 10 minutes, however strong the signals", () => {
    const [first] = run({
      entry: "dm",
      hour: 23,
      dailyMinBefore: 90,
      stillInDark: true,
      dwell: () => 800,
      minutes: 30,
    });
    expect(MIN_FEED_MS).toBe(10 * MIN);
    expect(first).toBeGreaterThanOrEqual(10);
  });

  it("came to reply to a message, slid into fast passive scrolling: paused at the 10-minute floor", () => {
    const [first] = run({ entry: "dm", hour: 14, dwell: fastBored, minutes: 30 });
    expect(first).toBeGreaterThanOrEqual(10);
    expect(first).toBeLessThan(11);
  });

  it("opened straight into the feed and switching fast, daytime: paused, but later than intent drift", () => {
    const [drift] = run({ entry: "dm", hour: 14, dwell: fastBored, minutes: 30 });
    const [home] = run({ entry: "home", hour: 14, dwell: fastBored, minutes: 30 });
    expect(home).toBeGreaterThan(drift!);
    expect(home).toBeLessThan(16);
  });

  it("the same pattern at night, after an hour of scrolling today, pauses at the 10-minute floor", () => {
    const [first] = run({
      entry: "home",
      hour: 23,
      dailyMinBefore: 60,
      dwell: fastBored,
      minutes: 30,
    });
    expect(first).toBeCloseTo(MIN_FEED_MS / MIN, 0);
  });

  it("after Keep going, the next pause waits for the cooldown and asks for a 5-second wait", () => {
    let s: SessionState = createSession(1, 0, { entry: "dm" });
    const waits: number[] = [];
    const at: number[] = [];
    for (let i = 0; s.sessionMs < 30 * MIN; i++) {
      s = sessionReducer(s, { type: "tick", dtMs: fastBored(i), speed: 1 });
      s = sessionReducer(s, { type: "step", dir: 1, dwellMs: fastBored(i), hour: 14 });
      const cur = currentItem(s);
      if (cur?.kind === "pause") {
        waits.push(cur.waitMs);
        at.push(cur.sessionMs);
        s = sessionReducer(s, { type: "keepGoing" });
      }
    }
    expect(waits.slice(0, 2)).toEqual([0, 5000]);
    expect(at[1]! - at[0]!).toBeGreaterThanOrEqual(COOLDOWN_MS);
  });
});

describe("pause message", () => {
  it("reminds the person of the purpose they came with", () => {
    expect(formatInterruption(12 * MIN, 140, "dm").sub).toBe(
      "You came here to reply to a message.",
    );
  });

  it("asks an open question when there was no visible purpose", () => {
    expect(formatInterruption(12 * MIN, 140, "home").sub).toMatch(/still what you want/);
  });

  it("says when the clock is sped up for the demo", () => {
    expect(formatInterruption(34 * MIN, 21, "home", true).note).toMatch(/Demo clock/);
  });
});

describe("session flow", () => {
  it("swiping is blocked while a pause is showing", () => {
    let s: SessionState = createSession(1, 0, { entry: "dm", dailyMinBefore: 90 });
    for (let i = 0; i < 2000 && currentItem(s)?.kind !== "pause"; i++) {
      s = sessionReducer(s, { type: "tick", dtMs: 1000, speed: 1 });
      s = sessionReducer(s, { type: "step", dir: 1, dwellMs: 1000, hour: 23 });
    }
    expect(currentItem(s)?.kind).toBe("pause");
    expect(sessionReducer(s, { type: "step", dir: 1, dwellMs: 1000, hour: 23 })).toBe(s);
  });

  it("logs one event per reel left, with direction and engagement", () => {
    let s = createSession(1);
    s = sessionReducer(s, { type: "engage", id: 0 });
    s = sessionReducer(s, { type: "step", dir: 1, dwellMs: 3000, hour: 14 });
    s = sessionReducer(s, { type: "step", dir: -1, dwellMs: 1000, hour: 14 });
    expect(s.events.map((e) => [e.direction, e.engaged])).toEqual([
      ["down", true],
      ["up", false],
    ]);
  });

  it("the next session carries today's running total forward", () => {
    let s = createSession(1, 0, { dailyMinBefore: 10 });
    s = sessionReducer(s, { type: "tick", dtMs: 5 * MIN, speed: 1 });
    s = sessionReducer(s, { type: "close" });
    s = sessionReducer(s, { type: "start" });
    expect(s.dailyMinBefore).toBeCloseTo(15);
  });

  it("asks 'well spent?' in 1 of every 5 sessions, only after the session ends", () => {
    expect(Array.from({ length: 10 }, (_, i) => shouldCheckIn(i + 1)).filter(Boolean)).toHaveLength(
      2,
    );
    let s = createSession(1);
    expect(s.askCheckIn).toBe(false);
    s = sessionReducer(s, { type: "close" });
    expect(s.askCheckIn).toBe(true);
  });
});
