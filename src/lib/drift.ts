// Pure drift-score rules. Every number the product promises lives here.

export const BASELINE_MIN = 9;
export const FAST_SWIPE_MS = 2000;
export const DRIFT_THRESHOLD = 70;
export const STREAK_TO_INTERRUPT = 5;
export const HARD_WAIT_MS = 5000;
export const CHECK_IN_EVERY = 5;
export const DEMO_SPEED = 10;
/** No swipe for this long (real time) pauses the session clock: the person has stopped scrolling. */
export const IDLE_MS = 60_000;
/** How many recent cards the swipe-based signals look at. */
export const RECENT_WINDOW = 8;
/** Cards needed before swipe-based signals count fully. */
export const CONFIDENT_AFTER = 5;

export const WEIGHTS = { session: 35, dwell: 20, fast: 30, night: 15 } as const;

export interface DriftInput {
  sessionMs: number;
  dwellsMs: number[];
  hour: number | null;
  baselineMin?: number;
  /** Time on the card currently on screen. Lingering is the opposite of skimming, so once it is
   * longer than a fast swipe it counts as a provisional sample and pulls the score down live. */
  currentDwellMs?: number;
}

export interface DriftPart {
  key: keyof typeof WEIGHTS;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface DriftResult {
  score: number;
  parts: DriftPart[];
  avgDwellSec: number;
  fastCount: number;
  recentCount: number;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function isFastSwipe(dwellMs: number) {
  return dwellMs < FAST_SWIPE_MS;
}

export function lateNightFactor(hour: number | null) {
  if (hour === null) return 0;
  if (hour >= 23 || hour < 5) return 1;
  if (hour === 22 || hour === 5) return 0.5;
  return 0;
}

export function computeDrift({
  sessionMs,
  dwellsMs,
  hour,
  baselineMin = BASELINE_MIN,
  currentDwellMs = 0,
}: DriftInput): DriftResult {
  const sessionMin = sessionMs / 60000;
  // Reaches full weight at twice the personal baseline.
  const sessionF = clamp(sessionMin / baselineMin / 2);

  const samples = currentDwellMs >= FAST_SWIPE_MS ? [...dwellsMs, currentDwellMs] : dwellsMs;
  const recent = samples.slice(-RECENT_WINDOW);
  const n = recent.length;
  const confidence = Math.min(1, n / CONFIDENT_AFTER);
  const avgDwellSec = n ? recent.reduce((a, b) => a + b, 0) / n / 1000 : 0;
  // Short average time per card = skimming. 1.5 s or less is full weight, 6 s or more is none.
  const dwellF = n ? clamp((6 - avgDwellSec) / 4.5) * confidence : 0;
  const fastCount = recent.filter(isFastSwipe).length;
  const fastF = n ? (fastCount / n) * confidence : 0;
  const nightF = lateNightFactor(hour);

  const parts: DriftPart[] = [
    {
      key: "session",
      label: "Session length",
      points: sessionF * WEIGHTS.session,
      max: WEIGHTS.session,
      detail: `${sessionMin.toFixed(1)} min so far · your usual is ${baselineMin} min`,
    },
    {
      key: "dwell",
      label: "Time on each card",
      points: dwellF * WEIGHTS.dwell,
      max: WEIGHTS.dwell,
      detail: n ? `about ${avgDwellSec.toFixed(1)} s per card` : "waiting for a few cards",
    },
    {
      key: "fast",
      label: "Fast swipes",
      points: fastF * WEIGHTS.fast,
      max: WEIGHTS.fast,
      detail: n ? `${fastCount} of last ${n} under 2 s` : "none yet",
    },
    {
      key: "night",
      label: "Late night",
      points: nightF * WEIGHTS.night,
      max: WEIGHTS.night,
      detail: nightF === 1 ? "it's late" : nightF > 0 ? "getting late" : "daytime",
    },
  ];

  const score = Math.round(
    clamp(
      parts.reduce((a, p) => a + p.points, 0),
      0,
      100,
    ),
  );
  return { score, parts, avgDwellSec, fastCount, recentCount: n };
}

export function nextStreak(streak: number, score: number) {
  return score > DRIFT_THRESHOLD ? streak + 1 : 0;
}

export function shouldInterrupt(streak: number) {
  return streak >= STREAK_TO_INTERRUPT;
}

/** After the user chose "Keep going" once, the next pause makes them wait. */
export function interruptionWaitMs(keptGoing: boolean) {
  return keptGoing ? HARD_WAIT_MS : 0;
}

/** Sessions 1, 6, 11 … get the "well spent?" check-in: 1 in 5. */
export function shouldCheckIn(sessionNumber: number) {
  return (sessionNumber - 1) % CHECK_IN_EVERY === 0;
}

export function formatInterruption(
  sessionMs: number,
  reels: number,
  baselineMin = BASELINE_MIN,
  demo = false,
) {
  const minutes = Math.max(1, Math.round(sessionMs / 60000));
  return {
    headline: `${minutes} min · ~${reels} reels.`,
    sub: `Your usual is ${baselineMin} min.`,
    // Demo speed runs the clock ×10 but not the reel count, so say so instead of showing odd numbers.
    note: demo ? `Demo clock ×${DEMO_SPEED}: minutes are sped up, reels are real.` : null,
  };
}

export function driftMood(score: number) {
  if (score > DRIFT_THRESHOLD) return "deep" as const;
  if (score >= 40) return "drift" as const;
  return "calm" as const;
}
