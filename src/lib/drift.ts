// Pure drift-score rules. Every number the product promises lives here.
// Each factor and its weight is grounded in src/lib/evidence.ts; numbers marked
// "assumption" there are design choices to be tested, not findings.

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
export const MIN_FEED_MS = 3 * 60_000;
/** At most one pause per this much feed time, to avoid desensitisation. */
export const COOLDOWN_MS = 5 * 60_000;
/** Typical social media session length, used only as a reference in copy (Ahmed et al. 2026). */
export const TYPICAL_SESSION_SEC = 94;

const SWITCH_WINDOW = 8;
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

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
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
    intent: intentFactor(entry, feedMin),
    switching: clamp(fastShare / 0.5) * confidence,
    passive: ramp(passiveShare, 0.5, 0.9) * Math.min(1, m / CONFIDENT_AFTER),
    time: ramp(feedMin, 2, 20),
    night: isNight(hour) ? 1 : 0,
    load: clamp(dailyMinBefore / 90),
  } satisfies Record<FactorKey, number>;

  const purpose = ENTRIES.find((e) => e.key === entry)?.purpose;
  const details: Record<FactorKey, string> = {
    intent:
      entry === "home"
        ? "opened straight into the feed"
        : entry === "work"
          ? "came from a work or study app"
          : feedMin < 1
            ? `came to ${purpose}`
            : `came to ${purpose} · ${feedMin.toFixed(1)} min in the feed since`,
    switching: n ? `${fastCount} of last ${n} swiped away in under 2 s` : "waiting for a few reels",
    passive: m
      ? `${Math.round(passiveShare * 100)}% of recent reels with no like or save`
      : "waiting for a few reels",
    time: `${feedMin.toFixed(1)} min in the feed · a typical session is ~1.5 min`,
    night: isNight(hour) ? "between 9 pm and 7 am" : "daytime",
    load: `${Math.round(dailyMinBefore)} min of short video earlier today`,
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

export function nextStreak(streak: number, score: number) {
  return score >= DRIFT_THRESHOLD ? streak + 1 : 0;
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
