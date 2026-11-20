// Builds the JSON the Reelio Android app's WebView expects (the shape reelio_alse.run_dashboard_payload
// produces), from the prototype's sessions. This lets the real Reelio app UI run unchanged inside the demo.
//
// Driver mapping (Reelio v1 signal → Android app driver):
//   minutes in the feed      → session_length
//   pressed "Keep going"     → exit_conflict
//   gap since last session   → rapid_reentry
//   skip rate                → scroll_automaticity
//   no interaction           → dwell_collapse
//   swiping back up          → rewatch_compulsion
//   night + lying in the dark→ environment

import type { SessionSummary } from "./baseline";
import type { DriftPart } from "./drift";
import type { SessionState } from "./session";

export const DRIVER_KEYS = [
  "session_length",
  "exit_conflict",
  "rapid_reentry",
  "scroll_automaticity",
  "dwell_collapse",
  "rewatch_compulsion",
  "environment",
] as const;
export type DriverKey = (typeof DRIVER_KEYS)[number];
export type Drivers = Record<DriverKey, number>;

const DOOM = 0.55;
const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const period = (h: number) =>
  h < 5 ? "Late Night" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";

export function driversFrom(parts: DriftPart[], s: SessionState, gapMin: number | null): Drivers {
  const frac = (k: string) => {
    const p = parts.find((x) => x.key === k);
    return p ? p.points / p.max : 0;
  };
  const back = s.events.filter((e) => e.direction === "up").length;
  return {
    session_length: frac("time"),
    exit_conflict: s.keptGoing ? Math.min(1, 0.5 + 0.25 * s.pauseCount) : 0,
    rapid_reentry: gapMin === null ? 0 : Math.max(0, 1 - gapMin / 10),
    scroll_automaticity: frac("skips"),
    dwell_collapse: frac("interaction"),
    rewatch_compulsion: Math.min(1, back / 5),
    environment: Math.min(1, (frac("night") * 10 + frac("bed") * 5) / 15),
  };
}

const ZERO: Drivers = Object.fromEntries(DRIVER_KEYS.map((k) => [k, 0])) as Drivers;

function topDriver(d: Drivers): DriverKey {
  return DRIVER_KEYS.reduce((a, k) => (d[k] > d[a] ? k : a), DRIVER_KEYS[0]);
}

function sessionObject(
  s: SessionSummary & { drivers?: Drivers | undefined },
  n: number,
  endAt?: number,
) {
  const S_t = Math.max(0, Math.min(1, s.peakScore / 100));
  const end = endAt ?? s.startedAt + s.minutes * 60000;
  const likes = Math.round(s.reels * s.interactionRate);
  const drivers = s.drivers ?? ZERO;
  const h = new Date(s.startedAt).getHours();
  const answered = s.checkIn !== null;
  return {
    sessionNum: String(n),
    S_t,
    raw_S_t: S_t,
    dominantState: S_t >= DOOM ? 1 : 0,
    nReels: s.reels,
    avgDwell: s.reels ? (s.minutes * 60) / s.reels : 0,
    timePeriod: period(h),
    date: stamp(s.startedAt).slice(5, 10),
    startTime: stamp(s.startedAt),
    endTime: stamp(end),
    sessionDurationSec: Math.round((end - s.startedAt) / 1000),
    heuristic_score: S_t,
    heuristic_components: drivers,
    session_top_driver: topDriver(drivers),
    totalLikes: likes,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalInteractions: likes,
    interactionRate: s.interactionRate,
    // The prototype's 1-in-5 check-in is a yes/no; map it onto the Android survey fields.
    postSessionRating: answered ? (s.checkIn === "yes" ? 4 : 2) : 0,
    regretScore: answered ? (s.checkIn === "yes" ? 1 : 4) : 0,
    moodBefore: 0,
    moodAfter: 0,
    intendedAction: "",
    actualVsIntended: 0,
    comparativeRating: 0,
    delayedRegretScore: 0,
    supervisedDoom: answered ? (s.checkIn === "no" ? 0.9 : 0.1) : S_t,
    hasSurvey: answered,
  };
}

export interface LiveSession {
  summary: SessionSummary & { drivers: Drivers };
  score: number;
}

export function buildPayload(
  history: SessionSummary[],
  live: LiveSession | null,
  now = Date.now(),
) {
  const all = [
    ...history.map((s, i) => sessionObject(s, i + 1)),
    ...(live ? [sessionObject(live.summary, history.length + 1, now)] : []),
  ];
  const todayKey = new Date(now).toDateString();
  const today = [...history, ...(live ? [live.summary] : [])].filter(
    (s) => new Date(s.startedAt).toDateString() === todayKey,
  );
  const last = history.at(-1);
  const lastEnd = last ? last.startedAt + last.minutes * 60000 : null;

  // Average driver mix across history: what usually pulls this person in.
  const withDrivers = history.filter((s) => s.drivers);
  const hist = Object.fromEntries(
    DRIVER_KEYS.map((k) => [
      k,
      withDrivers.length
        ? withDrivers.reduce((a, s) => a + s.drivers![k], 0) / withDrivers.length
        : 0,
    ]),
  ) as Drivers;
  const histSum = DRIVER_KEYS.reduce((a, k) => a + hist[k], 0) || 1;
  const historical_drivers = Object.fromEntries(
    DRIVER_KEYS.map((k) => [k, Math.round((hist[k] / histSum) * 1e4) / 1e4]),
  );

  // Two-hour circadian bins of average capture.
  const circadian = Array.from({ length: 12 }, (_, b) => {
    const ss = history.filter((s) => Math.floor(new Date(s.startedAt).getHours() / 2) === b);
    return {
      h: pad(b * 2),
      doom: ss.length
        ? Math.round((ss.reduce((a, s) => a + s.peakScore, 0) / ss.length / 100) * 100) / 100
        : 0,
    };
  });

  // Week-over-week doom rate.
  const week = 7 * 86_400_000;
  const inRange = (from: number, to: number) =>
    history.filter((s) => s.startedAt >= from && s.startedAt < to);
  const thisWeek = inRange(now - week, now + 1);
  const lastWeek = inRange(now - 2 * week, now - week);
  const rate = (ss: SessionSummary[]) =>
    ss.length ? ss.filter((s) => s.peakScore / 100 >= DOOM).length / ss.length : 0;
  const tw = rate(thisWeek);
  const lw = rate(lastWeek);

  // Session-to-session transitions between casual (0) and captured (1).
  const counts = [
    [1, 1],
    [1, 1],
  ];
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1]!.peakScore / 100 >= DOOM ? 1 : 0;
    const b = history[i]!.peakScore / 100 >= DOOM ? 1 : 0;
    counts[a]![b]! += 1;
  }
  const norm = (r: number[]) => r.map((x) => x / (r[0]! + r[1]!));

  return {
    pipeline_version: 6,
    sessions: all,
    model_parameters: {
      transition_matrix: [norm(counts[0]!), norm(counts[1]!)],
      session_transition_matrix: [norm(counts[0]!), norm(counts[1]!)],
    },
    historical_drivers,
    top_historical_driver: topDriver(hist),
    circadian,
    model_confidence: Math.round((history.length / (history.length + 10)) * 100) / 100,
    captureRiskScore: live ? live.score : (last?.peakScore ?? 0),
    sessionsToday: today.length,
    idleSinceLastSessionMin: live || !lastEnd ? 0 : Math.max(0, (now - lastEnd) / 60000),
    timeSinceLastSessionMin: lastEnd
      ? Math.max(0, ((live?.summary.startedAt ?? now) - lastEnd) / 60000)
      : null,
    weekly_summary: {
      this_week_doom_rate: tw,
      last_week_doom_rate: lw,
      delta_pct: lw ? ((tw - lw) / lw) * 100 : 0,
      session_count_this_week: thisWeek.length,
      session_count_last_week: lastWeek.length,
      insight:
        thisWeek.length < 3
          ? "Not enough sessions this week yet."
          : tw > lw
            ? "More of your sessions slid into autopilot this week."
            : "Fewer of your sessions slid into autopilot this week.",
    },
  };
}
