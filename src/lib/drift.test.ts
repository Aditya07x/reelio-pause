import { describe, expect, it } from "vitest";
import { computeDrift, formatInterruption, isFastSwipe, shouldCheckIn } from "./drift";
import { createSession, currentItem as maybeCurrent, sessionReducer, type PauseItem, type SessionState } from "./session";

const currentItem = (s: SessionState) => maybeCurrent(s)!;
const waitOf = (s: SessionState) => (currentItem(s) as PauseItem).waitMs;

const MIN = 60000;
const part = (r: ReturnType<typeof computeDrift>, key: string) =>
  r.parts.find((p) => p.key === key)!.points;

describe("drift score", () => {
  it("compares session length with a 9-minute baseline", () => {
    const atBaseline = computeDrift({ sessionMs: 9 * MIN, dwellsMs: [], hour: 14 });
    const twice = computeDrift({ sessionMs: 18 * MIN, dwellsMs: [], hour: 14 });
    expect(part(atBaseline, "session")).toBeCloseTo(17.5);
    expect(part(twice, "session")).toBe(35);
  });

  it("treats swipes under 2 seconds as fast", () => {
    expect(isFastSwipe(1999)).toBe(true);
    expect(isFastSwipe(2000)).toBe(false);
  });

  it("adds late-night points after 11pm but not in the afternoon", () => {
    expect(part(computeDrift({ sessionMs: 0, dwellsMs: [], hour: 1 }), "night")).toBe(15);
    expect(part(computeDrift({ sessionMs: 0, dwellsMs: [], hour: 14 }), "night")).toBe(0);
  });

  it("stays between 0 and 100", () => {
    const r = computeDrift({ sessionMs: 120 * MIN, dwellsMs: Array(10).fill(300), hour: 2 });
    expect(r.score).toBe(100);
  });
});

function driftingSession(overrides: Partial<SessionState> = {}): SessionState {
  // 30 min in, already 8 fast swipes: every further fast swipe scores above 70.
  return { ...createSession(), sessionMs: 30 * MIN, dwells: Array(8).fill(800), ...overrides };
}
const fast = (s: SessionState) =>
  sessionReducer(s, { type: "step", dir: 1, dwellMs: 800, hour: 14 });

describe("interruptions", () => {
  it("does not interrupt after 4 drifting cards in a row", () => {
    let s = driftingSession();
    for (let i = 0; i < 4; i++) s = fast(s);
    expect(currentItem(s).kind).toBe("reel");
  });

  it("interrupts after 5 drifting cards in a row", () => {
    let s = driftingSession();
    for (let i = 0; i < 5; i++) s = fast(s);
    expect(currentItem(s).kind).toBe("pause");
  });

  it("a calm card resets the streak", () => {
    let s = driftingSession();
    for (let i = 0; i < 4; i++) s = fast(s);
    s = sessionReducer({ ...s, sessionMs: 0 }, { type: "step", dir: 1, dwellMs: 9000, hour: 14 });
    expect(s.streak).toBe(0);
  });

  it("first pause can be dismissed at once; after Keep going the next one waits 5 seconds", () => {
    let s = driftingSession();
    for (let i = 0; i < 5; i++) s = fast(s);
    expect(currentItem(s).kind).toBe("pause");
    expect(waitOf(s)).toBe(0);

    s = sessionReducer(s, { type: "keepGoing" });
    expect(currentItem(s).kind).toBe("reel");
    for (let i = 0; i < 5; i++) s = fast(s);
    expect(currentItem(s).kind).toBe("pause");
    expect(waitOf(s)).toBe(5000);
  });

  it("swiping is blocked while a pause is showing", () => {
    let s = driftingSession();
    for (let i = 0; i < 5; i++) s = fast(s);
    expect(fast(s)).toBe(s);
  });

  it("formats the pause message", () => {
    expect(formatInterruption(34 * MIN, 210)).toEqual({
      headline: "34 min · ~210 reels.",
      sub: "Your usual is 9 min.",
    });
  });
});

describe("check-in", () => {
  it("asks 'well spent?' in 1 of every 5 sessions", () => {
    const asked = Array.from({ length: 10 }, (_, i) => shouldCheckIn(i + 1));
    expect(asked.filter(Boolean)).toHaveLength(2);
  });

  it("asks only after the session ends", () => {
    let s = createSession(1);
    expect(s.askCheckIn).toBe(false);
    s = sessionReducer(s, { type: "close" });
    expect(s.phase).toBe("ended");
    expect(s.askCheckIn).toBe(true);
  });
});
