// Personal baselines: what is "normal" for this person, learned from their own sessions.
//
// Same idea as UserBaseline in the Reelio Android model: start from a prior and move towards the
// person's own data as it accumulates (a Normal-mean shrinkage estimate):
//
//     estimate = (k · prior + n · personal mean) / (k + n)
//
// With no history the detector uses the research defaults; after ~k sessions the person's own
// pattern carries half the weight; after many sessions it dominates. Nothing here is fitted to the
// author's data: the priors come from the literature (see evidence.ts), the rest is the user's own.

import type { EntryContext } from "./drift";
import type { Drivers } from "./reelio-payload";
import type { StateKey } from "./states";

export interface SessionSummary {
  id: number;
  /** Epoch ms when the session started. */
  startedAt: number;
  minutes: number;
  reels: number;
  /** Share of reels left within 2 s. */
  skipRate: number;
  /** Share of reels with a like/save/share/comment. */
  interactionRate: number;
  hour: number;
  entry: EntryContext;
  peakScore: number;
  state: StateKey;
  pauses: number;
  checkIn: "yes" | "no" | null;
  /** What pulled the session in, in the Android app's seven-driver vocabulary (0–1 each). */
  drivers?: Drivers | undefined;
}

export interface Baseline {
  /** Typical session length, minutes. */
  sessionMin: number;
  /** Typical share of fast skips. */
  skipRate: number;
  /** Typical short-video minutes per day. */
  dailyMin: number;
  /** Sessions and days the estimate has seen. */
  n: number;
  days: number;
  /** Learned from "well spent?" answers; added to the pause threshold. */
  thresholdOffset: number;
}

/** Priors and their strength k (in sessions, or days for dailyMin). */
export const PRIORS = {
  sessionMin: {
    mean: 1.5,
    k: 5,
    source: "typical social media session ≈ 94 s (Ahmed et al. 2026)",
  },
  skipRate: { mean: 0.2, k: 5, source: "design assumption; tuned by the person's own skips" },
  dailyMin: {
    mean: 57,
    k: 3,
    source: "55–60 min/day projected for Indian short-video users (Bain)",
  },
} as const;

export const DEFAULT_BASELINE: Baseline = {
  sessionMin: PRIORS.sessionMin.mean,
  skipRate: PRIORS.skipRate.mean,
  dailyMin: PRIORS.dailyMin.mean,
  n: 0,
  days: 0,
  thresholdOffset: 0,
};

const shrink = (prior: number, k: number, values: number[]) =>
  (k * prior + values.reduce((a, b) => a + b, 0)) / (k + values.length);

/** How much the person's own data counts in the estimate, 0–1. */
export const personalWeight = (n: number, k: number) => n / (n + k);

const dayKey = (t: number) => new Date(t).toDateString();

/**
 * Check-ins tune sensitivity, like Reelio's RegretValidator:
 * a regretted session that was never paused → pause a little earlier next time (−2);
 * a paused session the person says was well spent → pause a little later (+3). Bounded ±10.
 */
export function thresholdOffsetFrom(history: SessionSummary[]) {
  let off = 0;
  for (const s of history) {
    if (s.checkIn === "no" && s.pauses === 0 && s.peakScore >= 45) off -= 2;
    if (s.checkIn === "yes" && s.pauses > 0) off += 3;
  }
  return Math.max(-10, Math.min(10, off));
}

export function computeBaseline(history: SessionSummary[]): Baseline {
  if (!history.length) return DEFAULT_BASELINE;
  const perDay = new Map<string, number>();
  for (const s of history)
    perDay.set(dayKey(s.startedAt), (perDay.get(dayKey(s.startedAt)) ?? 0) + s.minutes);
  // Today is still in progress, so it does not count as a full day of use.
  const today = dayKey(Date.now());
  const fullDays = [...perDay.entries()].filter(([d]) => d !== today).map(([, m]) => m);
  return {
    sessionMin: shrink(
      PRIORS.sessionMin.mean,
      PRIORS.sessionMin.k,
      history.map((s) => s.minutes),
    ),
    skipRate: shrink(
      PRIORS.skipRate.mean,
      PRIORS.skipRate.k,
      history.map((s) => s.skipRate),
    ),
    dailyMin: shrink(PRIORS.dailyMin.mean, PRIORS.dailyMin.k, fullDays),
    n: history.length,
    days: fullDays.length,
    thresholdOffset: thresholdOffsetFrom(history),
  };
}

/** Minutes of short video today before now, from history. */
export function minutesToday(history: SessionSummary[], now = Date.now()) {
  const d = dayKey(now);
  return history.filter((s) => dayKey(s.startedAt) === d).reduce((a, s) => a + s.minutes, 0);
}

// ---------------------------------------------------------------------------
// Synthetic sample users, so a viewer can watch the baseline adapt. Generated, not real.
// ---------------------------------------------------------------------------

export type SamplePersona = "light" | "evening";

export const PERSONAS: Record<SamplePersona, { label: string; description: string }> = {
  light: {
    label: "Light checker",
    description: "Many 1–3 minute check-ins, likes a lot, rarely at night.",
  },
  evening: {
    label: "Evening scroller",
    description: "A few long sessions, mostly after 9 pm, skips a lot, rarely likes.",
  },
};

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Fourteen days of synthetic history ending yesterday. */
export function sampleHistory(persona: SamplePersona, now = Date.now()): SessionSummary[] {
  const r = rng(persona === "light" ? 11 : 29);
  const out: SessionSummary[] = [];
  let id = 1;
  for (let day = 14; day >= 1; day--) {
    const base = new Date(now - day * 86_400_000);
    const count = persona === "light" ? 8 + Math.floor(r() * 5) : 3 + Math.floor(r() * 2);
    for (let i = 0; i < count; i++) {
      const hour =
        persona === "light"
          ? 8 + Math.floor(r() * 13)
          : r() < 0.75
            ? 21 + Math.floor(r() * 3)
            : 13 + Math.floor(r() * 5);
      const minutes = persona === "light" ? 0.6 + r() * 2.6 : 8 + r() * 22;
      const skipRate = persona === "light" ? 0.08 + r() * 0.15 : 0.35 + r() * 0.3;
      const peakScore = persona === "light" ? 10 + r() * 25 : 45 + r() * 40;
      const t = new Date(base);
      t.setHours(hour % 24, Math.floor(r() * 60), 0, 0);
      out.push({
        id: id++,
        startedAt: t.getTime(),
        minutes: Math.round(minutes * 10) / 10,
        reels: Math.round(minutes * (persona === "light" ? 8 : 16)),
        skipRate: Math.round(skipRate * 100) / 100,
        interactionRate: persona === "light" ? 0.3 : 0.05,
        hour: hour % 24,
        entry: persona === "light" ? (r() < 0.5 ? "notification" : "home") : "home",
        peakScore: Math.round(peakScore),
        state:
          peakScore >= 70
            ? "doom"
            : peakScore >= 45
              ? "hooked"
              : peakScore >= 25
                ? "aware"
                : "mindful",
        pauses: persona === "evening" && peakScore >= 70 ? 1 : 0,
        checkIn: null,
        drivers:
          persona === "light"
            ? {
                session_length: 0.05 + r() * 0.1,
                exit_conflict: 0,
                rapid_reentry: 0.3 + r() * 0.5,
                scroll_automaticity: 0.05 + r() * 0.15,
                dwell_collapse: 0.1 + r() * 0.2,
                rewatch_compulsion: r() * 0.2,
                environment: hour % 24 >= 21 ? 0.67 : 0,
              }
            : {
                session_length: 0.4 + r() * 0.6,
                exit_conflict: peakScore >= 70 ? 0.5 + r() * 0.3 : r() * 0.2,
                rapid_reentry: r() * 0.2,
                scroll_automaticity: 0.5 + r() * 0.5,
                dwell_collapse: 0.6 + r() * 0.4,
                rewatch_compulsion: r() * 0.3,
                environment: hour % 24 >= 21 ? 0.67 + r() * 0.33 : 0,
              },
      });
    }
  }
  return out.sort((a, b) => a.startedAt - b.startedAt);
}
