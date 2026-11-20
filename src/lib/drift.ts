// Pure drift-score rules. Every number the product promises lives here.
// Each factor and its weight is grounded in src/lib/evidence.ts; numbers marked
// "assumption" there are design choices to be tested, not findings.

import { DEFAULT_BASELINE, type Baseline } from "./baseline";
import { FACTORS, type FactorKey } from "./evidence";

export type EntryContext = "home" | "dm" | "notification" | "search" | "work";

export const ENTRIES: { key: EntryContext; label: string; purpose: string | null }[] = [
  { key: "home", label: "Opened the app, landed in the feed", purpose: null },
  { key: "dm", label: "Came to reply to a message", purpose: "reply to a message" },
  { key: "notification", label: "Tapped a notification", purpose: "check a notification" },
  { key: "search", label: "Searched for something", purpose: "look something up" },
  { key: "work", label: "Switched over from a work or study app", purpose: null },
];

export const FAST_SWIPE_MS = 2000;
export const DRIFT_THRESHOLD = 60;
export const STREAK_TO_INTERRUPT = 5;
export const HARD_WAIT_MS = 5000;
export const CHECK_IN_EVERY = 5;
export const DEMO_SPEED = 10;
/** No swipe for this long (real time) pauses the session clock: the person has stopped scrolling. */
export const IDLE_MS = 60_000;
/** Never interrupt before this much time in the feed: quick checks are left alone. */
export const MIN_FEED_MS = 10 * 60_000;
/** At most one pause per this much feed time, to avoid desensitisation. */
export const COOLDOWN_MS = 5 * 60_000;
/** Typical social media session length, used only as a reference in copy (Ahmed et al. 2026). */
export const TYPICAL_SESSION_SEC = 94;

const SWITCH_WINDOW = 10;
const PASSIVE_WINDOW = 10;
const CONFIDENT_AFTER = 5;

export const WEIGHTS = Object.fromEntries(FACTORS.map((f) => [f.key, f.weight])) as Record<
  FactorKey,
  number
>;

export interface DriftInput {
  /** Time in the feed this session (demo speed already applied). */
  sessionMs: number;
  dwellsMs: number[];
  /** Parallel to dwellsMs: did the person like/save/share/comment on that reel? */
  engaged?: boolean[];
  hour: number | null;
  entry?: EntryContext;
  /** Minutes already spent in short-video feeds today, before this session. */
  dailyMinBefore?: number;
  /** Time on the card currently on screen. Once longer than a fast swipe it counts as a (slow) sample. */
  currentDwellMs?: number;
  /** Motion and light sensors agree the phone is held still in a dark room. */
  stillInDark?: boolean;
  /** This person's learned normal; defaults to the research priors. */
  baseline?: Baseline;
}

export interface DriftPart {
  key: FactorKey;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface DriftResult {
  score: number;
  parts: DriftPart[];
  fastCount: number;
  recentCount: number;
}

function clamp(v: number, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}
const ramp = (v: number, from: number, to: number) => clamp((v - from) / (to - from));

export function isFastSwipe(dwellMs: number) {
  return dwellMs < FAST_SWIPE_MS;
}

/** 9 pm – 7 am, the window used by Ahmed et al. 2026. */
export function isNight(hour: number | null) {
  return hour !== null && (hour >= 21 || hour < 7);
}

export function intentFactor(entry: EntryContext, feedMin: number) {
  if (entry === "home") return 0.6; // no visible purpose: not proof of none
  if (entry === "work") return 0.8; // possible escape from a task (weak evidence, see evidence.ts)
  return ramp(feedMin, 1, 3); // a purpose existed; drifting into the feed counts after 1 min, fully after 3
}

export function computeDrift({
  sessionMs,
  dwellsMs,
  engaged = [],
  hour,
  entry = "home",
  dailyMinBefore = 0,
  currentDwellMs = 0,
  stillInDark = false,
  baseline = DEFAULT_BASELINE,
}: DriftInput): DriftResult {
  const feedMin = sessionMs / 60000;

  const samples = currentDwellMs >= FAST_SWIPE_MS ? [...dwellsMs, currentDwellMs] : dwellsMs;
  const recent = samples.slice(-SWITCH_WINDOW);
  const n = recent.length;
  const confidence = Math.min(1, n / CONFIDENT_AFTER);
  const fastCount = recent.filter(isFastSwipe).length;
  const fastShare = n ? fastCount / n : 0;

  const recentEng = engaged.slice(-PASSIVE_WINDOW);
  const m = Math.min(recentEng.length, dwellsMs.length);
  const passiveShare = m ? recentEng.filter((e) => !e).length / m : 0;

  const f = {
    entry: intentFactor(entry, feedMin),
    // Skips above this person's usual rate count; full weight 30 points above it.
    skips: clamp((fastShare - baseline.skipRate) / 0.3) * confidence,
    interaction: ramp(passiveShare, 0.5, 0.9) * Math.min(1, m / CONFIDENT_AFTER),
    // Starts at twice this person's usual session (never before 2 or after 10 min), full at 20 min.
    time: ramp(feedMin, timeStart(baseline), 20),
    night: isNight(hour) ? 1 : 0,
    bed: stillInDark ? 1 : 0,
    // Full weight at 1.5× this person's usual day.
    load: clamp(dailyMinBefore / (1.5 * baseline.dailyMin)),
  } satisfies Record<FactorKey, number>;

  const purpose = ENTRIES.find((e) => e.key === entry)?.purpose;
  const details: Record<FactorKey, string> = {
    entry:
      entry === "home"
        ? "home screen → feed, nothing else opened"
        : entry === "work"
          ? "switched over from a work or study app"
          : feedMin < 1
            ? `came to ${purpose}`
            : `came to ${purpose} · in the Reels feed for ${feedMin.toFixed(1)} min since`,
    skips: n
      ? `${fastCount} of last ${n} left in under 2 s · usual ${Math.round(baseline.skipRate * 100)}%`
      : "waiting for a few reels",
    interaction: m
      ? `${Math.round(passiveShare * 100)}% of last ${m} reels with no like, save or share`
      : "waiting for a few reels",
    time: `${feedMin.toFixed(1)} min · your usual session ${baseline.sessionMin.toFixed(1)} min`,
    night: isNight(hour) ? "between 9 pm and 7 am" : "daytime",
    bed: stillInDark ? "phone still, room dark" : "moving or in light",
    load: `${Math.round(dailyMinBefore)} min earlier today · your usual day ${Math.round(baseline.dailyMin)} min`,
  };

  const parts: DriftPart[] = FACTORS.map((fx) => ({
    key: fx.key,
    label: fx.label,
    points: f[fx.key] * fx.weight,
    max: fx.weight,
    detail: details[fx.key],
  }));

  const score = Math.round(
    clamp(
      parts.reduce((a, p) => a + p.points, 0),
      0,
      100,
    ),
  );
  return { score, parts, fastCount, recentCount: n };
}

export function timeStart(baseline: Baseline = DEFAULT_BASELINE) {
  return clamp(2 * baseline.sessionMin, 2, 10);
}

/** The pause threshold for this person: the default, nudged by their check-ins. */
export function thresholdFor(baseline: Baseline = DEFAULT_BASELINE) {
  return DRIFT_THRESHOLD + baseline.thresholdOffset;
}

export function nextStreak(streak: number, score: number, threshold = DRIFT_THRESHOLD) {
  return score >= threshold ? streak + 1 : 0;
}

/** Interrupt only after a sustained high score, past the minimum feed time, and outside the cooldown. */
export function shouldInterrupt(
  streak: number,
  sessionMs = Infinity,
  lastPauseAtMs: number | null = null,
) {
  if (streak < STREAK_TO_INTERRUPT) return false;
  if (sessionMs < MIN_FEED_MS) return false;
  if (lastPauseAtMs !== null && sessionMs - lastPauseAtMs < COOLDOWN_MS) return false;
  return true;
}

/** After the user chose "Keep going" once, the next pause makes them wait. */
export function interruptionWaitMs(keptGoing: boolean) {
  return keptGoing ? HARD_WAIT_MS : 0;
}

// ---------------------------------------------------------------------------
// The intervention ladder. Soft, gradual steps come first because they cause
// less pushback; the full-screen pause comes last because it stops scrolling
// fastest (Meinhardt et al. 2026: pop-up median 7 s to stop vs 56 s for a
// gradual visual, but gradual steps were tolerated about 2.5× longer).
// ---------------------------------------------------------------------------

export type Level = 0 | 1 | 2 | 3;

export const LADDER: { level: Exclude<Level, 0>; name: string; what: string; why: string }[] = [
  {
    level: 1,
    name: "Heavier scroll",
    what: "A swipe has to travel about two-thirds of the screen instead of a third, and the next reel slides in more slowly.",
    why: "Friction in the feed itself, with no screen to dismiss (Ruiz et al. 2024; one sec, Grüning et al. 2023).",
  },
  {
    level: 2,
    name: "Colour drains",
    what: "Reels fade to grayscale and a small Reelio chip shows how long you have been in Reels.",
    why: "Grayscale made phones less rewarding and cut screen time in several trials (Holte & Ferraro 2020; Zimmermann & Sobolev 2023).",
  },
  {
    level: 3,
    name: "Full-screen pause",
    what: "Reelio covers the feed with a pause screen. The second time, it asks for a 5-second wait first.",
    why: "The format that stops scrolling fastest (Meinhardt et al. 2026).",
  },
];

/** Feed time between one step of the ladder and the next. */
export const STEP_GAP_MS = 2 * 60_000;
/** Reels in a row below the threshold before Reelio steps all the way back down. */
export const CALM_TO_RESET = 10;
/** Share of the screen height a swipe must travel to change reel. Instagram: about a third. */
export const SWIPE_SHARE = 1 / 3;
export const SWIPE_SHARE_FRICTION = 2 / 3;
/** A quick flick changes reel even when it is short (not at level 1 and above). */
export const FLICK_PX_PER_MS = 0.5;

export function swipeShareFor(level: Level) {
  return level >= 1 ? SWIPE_SHARE_FRICTION : SWIPE_SHARE;
}
/** How far the card follows the finger: 1 = exactly, lower = feels heavier. */
export function dragFollowFor(level: Level) {
  return level >= 1 ? 0.45 : 1;
}
export function slideMsFor(level: Level) {
  return level >= 1 ? 950 : 420;
}

export interface LadderInput {
  level: Level;
  streak: number;
  sessionMs: number;
  /** Feed time when the current level started. */
  levelAtMs: number | null;
  /** Feed time of the last full-screen pause. */
  lastPauseAtMs: number | null;
}

/**
 * What the ladder does after this reel: step up one level, show the full-screen
 * pause again (only once already at level 3), or nothing.
 */
export function nextRung({ level, streak, sessionMs, levelAtMs, lastPauseAtMs }: LadderInput) {
  if (streak < STREAK_TO_INTERRUPT || sessionMs < MIN_FEED_MS) return null;
  if (level === 0) return 1 as const;
  if (level < 3) {
    if (levelAtMs !== null && sessionMs - levelAtMs < STEP_GAP_MS) return null;
    return (level + 1) as 2 | 3;
  }
  if (lastPauseAtMs !== null && sessionMs - lastPauseAtMs < COOLDOWN_MS) return null;
  return 3 as const;
}

/**
 * The two or three signals that pushed the score up most, in plain words, for the
 * pause screen. Showing why keeps the pause from feeling arbitrary.
 */
export function pauseReasons(r: DriftResult, entry: EntryContext, sessionMs: number, dailyMinBefore = 0) {
  const purpose = ENTRIES.find((e) => e.key === entry)?.purpose;
  const words: Record<FactorKey, string> = {
    entry: purpose ? `You came to ${purpose}` : "Opened straight into Reels",
    skips: `Skipped ${r.fastCount} of the last ${r.recentCount}`,
    interaction: "No likes or saves lately",
    time: `${Math.round(sessionMs / 60000)} min in Reels`,
    night: "It's late",
    bed: "Lying still in the dark",
    load: `${Math.round(dailyMinBefore)} min of Reels earlier today`,
  };
  return [...r.parts]
    .filter((p) => p.points > 0)
    .sort((x, y) => y.points / y.max - x.points / x.max || y.points - x.points)
    .slice(0, 3)
    .map((p) => words[p.key]);
}

/** Earliest feed time each level can start, if the score stays high throughout. */
export function earliestLevelMs(level: Exclude<Level, 0>) {
  return MIN_FEED_MS + (level - 1) * STEP_GAP_MS;
}

/** Sessions 1, 6, 11 … get the "well spent?" check-in: 1 in 5. */
export function shouldCheckIn(sessionNumber: number) {
  return (sessionNumber - 1) % CHECK_IN_EVERY === 0;
}

export function formatInterruption(
  sessionMs: number,
  reels: number,
  entry: EntryContext = "home",
  demo = false,
) {
  const minutes = Math.max(1, Math.round(sessionMs / 60000));
  const purpose = ENTRIES.find((e) => e.key === entry)?.purpose ?? null;
  return {
    headline: `${minutes} min · ~${reels} reels.`,
    // Remind of the original purpose when there was one: intention reminders beat restriction (Ahmed et al. 2026).
    sub: purpose ? `You came here to ${purpose}.` : "Is this still what you want to be doing?",
    note: demo ? `Demo clock ×${DEMO_SPEED}: minutes are sped up, reels are real.` : null,
  };
}

export function driftMood(score: number) {
  if (score >= DRIFT_THRESHOLD) return "deep" as const;
  if (score >= 35) return "drift" as const;
  return "calm" as const;
}
