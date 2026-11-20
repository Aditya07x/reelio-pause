// Replays real logged sessions (from the Android app) through the exact same detector
// the live demo uses, and compares it with a plain session timer.
import raw from "@/data/replay-sessions.json";
import { computeDrift, nextStreak, shouldInterrupt, type DwellStat } from "./drift";

export interface RealSession {
  id: number;
  startHour: number;
  weekday: string;
  minutes: number;
  /** 1–5 self-report right after the session; null when not asked. */
  regret: number | null;
  reason: string | null;
  /** [dwellMs, liked] per reel, in order. */
  reels: [number, number][];
}

export const SESSIONS = (raw as unknown as { sessions: RealSession[] }).sessions;
export const REGRETTED = 4; // regret 4–5 counts as a session the person wished had ended sooner

export interface Detector {
  key: string;
  label: string;
  kind: "drift" | "timer";
  dwellStat?: DwellStat;
  timerMin?: number;
}

export const DETECTORS: Detector[] = [
  { key: "v2", label: "Reelio v2", kind: "drift", dwellStat: "median" },
  { key: "v1", label: "Reelio v1", kind: "drift", dwellStat: "mean" },
  { key: "timer", label: "15-min timer", kind: "timer", timerMin: 15 },
];

export interface ReplayPoint {
  reel: number;
  min: number;
  score: number;
}

export interface ReplayResult {
  points: ReplayPoint[];
  totalMin: number;
  /** Minute into the session where the detector would have interrupted, or null. */
  firedAtMin: number | null;
  firedAtReel: number | null;
}

/** Same rule as the live feed: score above threshold for N cards in a row, checked as each card is left. */
export function replay(session: RealSession, dwellStat: DwellStat = "median"): ReplayResult {
  const dwells: number[] = [];
  const points: ReplayPoint[] = [];
  let ms = 0;
  let streak = 0;
  let firedAtMin: number | null = null;
  let firedAtReel: number | null = null;
  session.reels.forEach(([d], i) => {
    ms += d;
    dwells.push(d);
    const { score } = computeDrift({
      sessionMs: ms,
      dwellsMs: dwells,
      hour: session.startHour,
      dwellStat,
    });
    streak = nextStreak(streak, score);
    if (firedAtMin === null && shouldInterrupt(streak)) {
      firedAtMin = ms / 60000;
      firedAtReel = i + 1;
    }
    points.push({ reel: i + 1, min: +(ms / 60000).toFixed(2), score });
  });
  return { points, totalMin: ms / 60000, firedAtMin, firedAtReel };
}

export function fireMinute(session: RealSession, det: Detector): number | null {
  if (det.kind === "timer") {
    const total = session.reels.reduce((a, [d]) => a + d, 0) / 60000;
    return total > det.timerMin! ? det.timerMin! : null;
  }
  return replay(session, det.dwellStat).firedAtMin;
}

export interface Scorecard {
  detector: Detector;
  regrettedTotal: number;
  regrettedCaught: number;
  fineTotal: number;
  falseAlarms: number;
  regrettedMinutes: number;
  /** Regretted minutes that came after the interruption, i.e. time the pause could have given back. */
  minutesAfterAlert: number;
}

export function scorecard(det: Detector, sessions = SESSIONS): Scorecard {
  const labelled = sessions.filter((s) => s.regret !== null);
  const card: Scorecard = {
    detector: det,
    regrettedTotal: 0,
    regrettedCaught: 0,
    fineTotal: 0,
    falseAlarms: 0,
    regrettedMinutes: 0,
    minutesAfterAlert: 0,
  };
  for (const s of labelled) {
    const total = s.reels.reduce((a, [d]) => a + d, 0) / 60000;
    const fired = fireMinute(s, det);
    if (s.regret! >= REGRETTED) {
      card.regrettedTotal += 1;
      card.regrettedMinutes += total;
      if (fired !== null) {
        card.regrettedCaught += 1;
        card.minutesAfterAlert += total - fired;
      }
    } else {
      card.fineTotal += 1;
      if (fired !== null) card.falseAlarms += 1;
    }
  }
  return card;
}
