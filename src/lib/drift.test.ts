import { describe, expect, it } from "vitest";
import {
  computeDrift,
  COOLDOWN_MS,
  CALM_TO_RESET,
  earliestLevelMs,
  formatInterruption,
  nextRung,
  STEP_GAP_MS,
  swipeShareFor,
  intentFactor,
  isFastSwipe,
  isNight,
  MIN_FEED_MS,
  shouldCheckIn,
  type EntryContext,
} from "./drift";
import {
  computeBaseline,
  DEFAULT_BASELINE,
  PRIORS,
  sampleHistory,
  type SessionSummary,
} from "./baseline";
import { FACTORS, WEIGHT_TOTAL } from "./evidence";
import {
  createSession,
  currentItem,
  sessionReducer,
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

  it("earlier short-video time today reaches full weight at 1.5× the usual day (prior 57 → 85.5 min)", () => {
    expect(
      part(computeDrift({ sessionMs: 0, dwellsMs: [], hour: 14, dailyMinBefore: 42.75 }), "load"),
    ).toBeCloseTo(5);
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
  /** What to do at the full-screen pause. */
  onPause?: "keepGoing" | "stop";
}

/** Runs a persona through the real reducer. Returns minutes at which each ladder step started. */
export function runLadder(p: Persona) {
  let s: SessionState = createSession(1, 0, {
    entry: p.entry,
    dailyMinBefore: p.dailyMinBefore ?? 0,
    stillInDark: p.stillInDark ?? false,
  });
  const at: Partial<Record<1 | 2 | 3, number>> = {};
  const pausesAtMin: number[] = [];
  for (let i = 0; s.sessionMs < p.minutes * MIN && i < 5000; i++) {
    const d = p.dwell(i);
    s = sessionReducer(s, { type: "tick", dtMs: d, speed: 1 });
    const cur = currentItem(s);
    if (p.engages?.(i) && cur) s = sessionReducer(s, { type: "engage", id: cur.id });
    s = sessionReducer(s, { type: "step", dir: 1, dwellMs: d, hour: p.hour });
    const L = s.level as 1 | 2 | 3;
    if (s.level > 0 && at[L] === undefined) at[L] = s.sessionMs / MIN;
    if (s.overlay) {
      pausesAtMin.push(s.overlay.sessionMs / MIN);
      if ((p.onPause ?? "stop") === "stop") break;
      s = sessionReducer(s, { type: "keepGoing" });
    }
  }
  return { at, pausesAtMin, firstStep: at[1], state: s };
}

/** Minutes at which Reelio first stepped in (ladder level 1), as a one-item list, or []. */
function run(p: Persona) {
  const { firstStep } = runLadder(p);
  return firstStep === undefined ? [] : [firstStep];
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

  it("came to reply to a message, slid into fast passive scrolling: first step at the 10-minute floor", () => {
    const [first] = run({ entry: "dm", hour: 14, dwell: fastBored, minutes: 30 });
    expect(first).toBeGreaterThanOrEqual(10);
    expect(first).toBeLessThan(11);
  });

  it("opened straight into the feed and switching fast, daytime: steps in, but later than intent drift", () => {
    const [drift] = run({ entry: "dm", hour: 14, dwell: fastBored, minutes: 30 });
    const [home] = run({ entry: "home", hour: 14, dwell: fastBored, minutes: 30 });
    expect(home).toBeGreaterThan(drift!);
    expect(home).toBeLessThan(16);
  });

  it("the same pattern at night, after an hour of scrolling today, steps in at the 10-minute floor", () => {
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
    for (let i = 0; s.sessionMs < 40 * MIN; i++) {
      s = sessionReducer(s, { type: "tick", dtMs: fastBored(i), speed: 1 });
      s = sessionReducer(s, { type: "step", dir: 1, dwellMs: fastBored(i), hour: 14 });
      if (s.overlay) {
        waits.push(s.overlay.waitMs);
        at.push(s.overlay.sessionMs);
        s = sessionReducer(s, { type: "keepGoing" });
      }
    }
    expect(waits.slice(0, 2)).toEqual([0, 5000]);
    expect(at[1]! - at[0]!).toBeGreaterThanOrEqual(COOLDOWN_MS);
  });
});

describe("intervention ladder", () => {
  const drifter = { entry: "dm" as const, hour: 14, dwell: fastBored, minutes: 40 };

  it("steps up one level at a time: heavier scroll, then grayscale, then the full-screen pause", () => {
    const { at } = runLadder(drifter);
    expect(at[1]).toBeGreaterThanOrEqual(10);
    expect(at[2]! - at[1]!).toBeGreaterThanOrEqual(STEP_GAP_MS / MIN);
    expect(at[3]! - at[2]!).toBeGreaterThanOrEqual(STEP_GAP_MS / MIN);
  });

  it("the full-screen pause never comes before 14 minutes", () => {
    expect(earliestLevelMs(3)).toBe(14 * MIN);
    const { pausesAtMin } = runLadder({ ...drifter, hour: 23, dailyMinBefore: 90, stillInDark: true, dwell: () => 800 });
    expect(pausesAtMin[0]).toBeGreaterThanOrEqual(14);
  });

  it("an engaged viewer never reaches any step", () => {
    const { at } = runLadder({
      entry: "home",
      hour: 23,
      dwell: () => 14_000,
      engages: (i) => i % 3 === 0,
      minutes: 40,
    });
    expect(at).toEqual({});
  });

  it("slowing down for 10 reels lifts the friction", () => {
    let s: SessionState = createSession(1, 0, { entry: "dm" });
    for (let i = 0; s.level < 1 && i < 3000; i++) {
      s = sessionReducer(s, { type: "tick", dtMs: 1000, speed: 1 });
      s = sessionReducer(s, { type: "step", dir: 1, dwellMs: 1000, hour: 14 });
    }
    expect(s.level).toBe(1);
    let slowReels = 0;
    for (; s.level > 0 && slowReels < 40; slowReels++) {
      const id = s.items[s.index]!.id;
      s = sessionReducer(s, { type: "engage", id });
      s = sessionReducer(s, { type: "tick", dtMs: 20_000, speed: 1 });
      s = sessionReducer(s, { type: "step", dir: 1, dwellMs: 20_000, hour: 14 });
    }
    expect(s.level).toBe(0);
    expect(slowReels).toBeGreaterThanOrEqual(CALM_TO_RESET);
  });

  it("nothing happens before the score has stayed high for 5 reels, or before 10 minutes", () => {
    const base = { level: 0 as const, levelAtMs: null, lastPauseAtMs: null };
    expect(nextRung({ ...base, streak: 4, sessionMs: 20 * MIN })).toBeNull();
    expect(nextRung({ ...base, streak: 5, sessionMs: 9 * MIN })).toBeNull();
    expect(nextRung({ ...base, streak: 5, sessionMs: 10 * MIN })).toBe(1);
  });

  it("a swipe needs a third of the screen normally and two-thirds with friction on", () => {
    expect(swipeShareFor(0)).toBeCloseTo(1 / 3);
    expect(swipeShareFor(1)).toBeCloseTo(2 / 3);
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
    for (let i = 0; i < 3000 && !s.overlay; i++) {
      s = sessionReducer(s, { type: "tick", dtMs: 1000, speed: 1 });
      s = sessionReducer(s, { type: "step", dir: 1, dwellMs: 1000, hour: 23 });
    }
    expect(s.overlay).not.toBeNull();
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

// ---------------------------------------------------------------------------
// Personal baselines
// ---------------------------------------------------------------------------

const summary = (over: Partial<SessionSummary>): SessionSummary => ({
  id: 1,
  startedAt: Date.now() - 2 * 86_400_000,
  minutes: 2,
  reels: 20,
  skipRate: 0.2,
  interactionRate: 0.2,
  hour: 14,
  entry: "home",
  peakScore: 20,
  state: "mindful",
  pauses: 0,
  checkIn: null,
  ...over,
});

describe("personal baseline", () => {
  it("with no history, uses the research priors", () => {
    expect(computeBaseline([])).toEqual(DEFAULT_BASELINE);
  });

  it("moves halfway to the person's own mean after k sessions", () => {
    const k = PRIORS.sessionMin.k;
    const h = Array.from({ length: k }, (_, i) => summary({ id: i, minutes: 11.5 }));
    expect(computeBaseline(h).sessionMin).toBeCloseTo((1.5 + 11.5) / 2);
  });

  it("the same skipping counts less for someone who always skips that much", () => {
    const dwellsMs = [800, 4000, 800, 4000, 800, 4000, 800, 4000, 800, 4000]; // 50% skips
    const usual = computeDrift({ sessionMs: 5 * MIN, dwellsMs, hour: 14 });
    const habitualSkipper = computeDrift({
      sessionMs: 5 * MIN,
      dwellsMs,
      hour: 14,
      baseline: { ...DEFAULT_BASELINE, skipRate: 0.45 },
    });
    expect(part(habitualSkipper, "skips")).toBeLessThan(part(usual, "skips"));
  });

  it("a regretted session that was never paused makes the next pause come a little earlier", () => {
    const b = computeBaseline([summary({ peakScore: 55, checkIn: "no" })]);
    expect(b.thresholdOffset).toBe(-2);
  });

  it("a paused session marked 'well spent' makes the next pause come a little later", () => {
    const b = computeBaseline([summary({ pauses: 1, peakScore: 75, checkIn: "yes" })]);
    expect(b.thresholdOffset).toBe(3);
  });

  it("an evening scroller's baseline ends up very different from a light checker's", () => {
    const light = computeBaseline(sampleHistory("light"));
    const evening = computeBaseline(sampleHistory("evening"));
    expect(evening.sessionMin).toBeGreaterThan(light.sessionMin * 3);
    expect(evening.skipRate).toBeGreaterThan(light.skipRate);
    expect(light.days).toBe(14);
  });
});
