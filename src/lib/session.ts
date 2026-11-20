import {
  computeDrift,
  CALM_TO_RESET,
  interruptionWaitMs,
  nextRung,
  nextStreak,
  pauseReasons,
  shouldCheckIn,
  thresholdFor,
  type EntryContext,
  type Level,
} from "./drift";
import { DEFAULT_BASELINE, type Baseline } from "./baseline";

export type ReelItem = { kind: "reel"; id: number };
export type FeedItem = ReelItem;

/** The full-screen pause (ladder level 3), drawn over the feed. */
export interface PauseOverlay {
  id: string;
  waitMs: number;
  sessionMs: number;
  reels: number;
  entry: EntryContext;
  /** The signals that pushed the score up most, in plain words. */
  reasons: string[];
}

/** One row per change of ladder level, for the panel and the log. */
export interface LadderStep {
  level: Level;
  atMs: number;
  reels: number;
  score: number;
}

export type CheckInAnswer = "yes" | "no";

/** One row per card the user leaves. Same fields the Android app logs per reel. */
export interface ReelEvent {
  index: number;
  itemId: number;
  dwellMs: number;
  direction: "down" | "up";
  engaged: boolean;
  sessionMs: number;
  hour: number | null;
  score: number;
  at: number;
}

export interface SessionState {
  phase: "feed" | "ended";
  sessionNumber: number;
  items: FeedItem[];
  index: number;
  nextReelId: number;
  sessionMs: number;
  dwells: number[];
  /** Parallel to dwells: liked/saved/shared/commented on that reel. */
  engaged: boolean[];
  /** Engagement on the reel currently on screen (moved into `engaged` when it is left). */
  currentEngaged: boolean;
  likedIds: number[];
  events: ReelEvent[];
  streak: number;
  /** Reels in a row below the threshold. Enough of them and the ladder steps back to 0. */
  calm: number;
  /** Current step of the intervention ladder (0 = nothing). */
  level: Level;
  levelAtMs: number | null;
  peakLevel: Level;
  ladder: LadderStep[];
  /** The full-screen pause, when it is showing. */
  overlay: PauseOverlay | null;
  lastPauseAtMs: number | null;
  /** How this session started: observed passively on a phone, chosen in the demo panel. */
  entry: EntryContext;
  /** Minutes already spent in short-video feeds today, before this session. */
  dailyMinBefore: number;
  /** Motion and light sensors agree the phone is held still in a dark room. */
  stillInDark: boolean;
  /** This person's learned normal, fixed for the session. */
  baseline: Baseline;
  /** Highest score reached this session (used to classify it afterwards). */
  peakScore: number;
  startedAt: number;
  keptGoing: boolean;
  pauseCount: number;
  summary: { ms: number; reels: number } | null;
  askCheckIn: boolean;
  checkIn: CheckInAnswer | null;
  history: { session: number; answer: CheckInAnswer }[];
}

export type SessionAction =
  | { type: "tick"; dtMs: number; speed: number }
  | { type: "step"; dir: 1 | -1; dwellMs: number; hour: number | null; at?: number }
  | { type: "engage"; id: number }
  | {
      type: "setContext";
      entry?: EntryContext;
      dailyMinBefore?: number;
      stillInDark?: boolean;
      baseline?: Baseline;
    }
  | { type: "keepGoing" }
  | { type: "close" }
  | { type: "start"; baseline?: Baseline; dailyMinBefore?: number; startedAt?: number }
  | { type: "answer"; answer: CheckInAnswer };

function withLookahead(items: FeedItem[], index: number, nextReelId: number) {
  const out = [...items];
  let id = nextReelId;
  while (out.length <= index + 1) out.push({ kind: "reel", id: id++ });
  return { items: out, nextReelId: id };
}

export function createSession(
  sessionNumber = 1,
  firstReelId = 0,
  context: {
    entry?: EntryContext;
    dailyMinBefore?: number;
    stillInDark?: boolean;
    baseline?: Baseline;
    startedAt?: number;
  } = {},
): SessionState {
  const { items, nextReelId } = withLookahead([], 0, firstReelId);
  return {
    phase: "feed",
    sessionNumber,
    items,
    index: 0,
    nextReelId,
    sessionMs: 0,
    dwells: [],
    engaged: [],
    currentEngaged: false,
    likedIds: [],
    events: [],
    streak: 0,
    calm: 0,
    level: 0,
    levelAtMs: null,
    peakLevel: 0,
    ladder: [],
    overlay: null,
    lastPauseAtMs: null,
    entry: context.entry ?? "home",
    dailyMinBefore: context.dailyMinBefore ?? 0,
    stillInDark: context.stillInDark ?? false,
    baseline: context.baseline ?? DEFAULT_BASELINE,
    peakScore: 0,
    startedAt: context.startedAt ?? 0,
    keptGoing: false,
    pauseCount: 0,
    summary: null,
    askCheckIn: false,
    checkIn: null,
    history: [],
  };
}

export function currentItem(s: SessionState) {
  return s.items[s.index];
}

export function canStep(s: SessionState, dir: 1 | -1) {
  if (s.phase !== "feed") return false;
  if (s.overlay) return false;
  if (dir < 0 && s.index === 0) return false;
  return true;
}

export function reelsSeen(s: SessionState) {
  return s.dwells.length + (currentItem(s) ? 1 : 0);
}

export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case "tick":
      if (s.phase !== "feed") return s;
      return { ...s, sessionMs: s.sessionMs + a.dtMs * a.speed };

    case "step": {
      if (!canStep(s, a.dir)) return s;
      const dwells = [...s.dwells, a.dwellMs];
      const engaged = [...s.engaged, s.currentEngaged];
      const result = computeDrift({
        sessionMs: s.sessionMs,
        dwellsMs: dwells,
        engaged,
        hour: a.hour,
        entry: s.entry,
        dailyMinBefore: s.dailyMinBefore,
        stillInDark: s.stillInDark,
        baseline: s.baseline,
      });
      const { score } = result;
      const threshold = thresholdFor(s.baseline);
      let streak = nextStreak(s.streak, score, threshold);
      const calm = score < threshold ? s.calm + 1 : 0;
      let { level, levelAtMs, ladder, overlay, pauseCount, lastPauseAtMs } = s;
      // Slowed down for long enough: step all the way back down.
      if (level > 0 && calm >= CALM_TO_RESET) {
        level = 0;
        levelAtMs = s.sessionMs;
        ladder = [...ladder, { level: 0, atMs: s.sessionMs, reels: dwells.length, score }];
      }
      const rung =
        a.dir > 0 ? nextRung({ level, streak, sessionMs: s.sessionMs, levelAtMs, lastPauseAtMs }) : null;
      if (rung !== null) {
        if (rung !== level) {
          level = rung;
          levelAtMs = s.sessionMs;
        }
        ladder = [...ladder, { level: rung, atMs: s.sessionMs, reels: dwells.length, score }];
        streak = 0;
        if (rung === 3) {
          overlay = {
            id: `pause-${s.sessionNumber}-${pauseCount}`,
            waitMs: interruptionWaitMs(s.keptGoing),
            sessionMs: s.sessionMs,
            reels: dwells.length,
            entry: s.entry,
            reasons: pauseReasons(result, s.entry, s.sessionMs, s.dailyMinBefore),
          };
          pauseCount += 1;
          lastPauseAtMs = s.sessionMs;
        }
      }
      const left = currentItem(s);
      const event: ReelEvent = {
        index: s.index,
        itemId: left ? left.id : -1,
        dwellMs: Math.round(a.dwellMs),
        direction: a.dir > 0 ? "down" : "up",
        engaged: s.currentEngaged,
        sessionMs: Math.round(s.sessionMs),
        hour: a.hour,
        score,
        at: a.at ?? 0,
      };
      const index = s.index + a.dir;
      const look = withLookahead(s.items, index, s.nextReelId);
      return {
        ...s,
        ...look,
        index,
        dwells,
        engaged,
        currentEngaged: false,
        events: [...s.events, event],
        streak,
        calm,
        level,
        levelAtMs,
        peakLevel: Math.max(s.peakLevel, level) as Level,
        ladder,
        overlay,
        pauseCount,
        lastPauseAtMs,
        peakScore: Math.max(s.peakScore, score),
      };
    }

    case "engage": {
      if (s.phase !== "feed" || s.overlay || !currentItem(s)) return s;
      const liked = s.likedIds.includes(a.id);
      return {
        ...s,
        currentEngaged: true,
        likedIds: liked ? s.likedIds : [...s.likedIds, a.id],
      };
    }

    case "setContext":
      return {
        ...s,
        entry: a.entry ?? s.entry,
        dailyMinBefore: a.dailyMinBefore ?? s.dailyMinBefore,
        stillInDark: a.stillInDark ?? s.stillInDark,
        baseline: a.baseline ?? s.baseline,
      };

    case "keepGoing": {
      if (s.phase !== "feed" || !s.overlay) return s;
      return { ...s, overlay: null, keptGoing: true };
    }

    case "close":
      if (s.phase !== "feed") return s;
      return {
        ...s,
        phase: "ended",
        overlay: null,
        summary: { ms: s.sessionMs, reels: reelsSeen(s) },
        askCheckIn: shouldCheckIn(s.sessionNumber),
        checkIn: null,
      };

    case "start": {
      // The next session inherits the entry choice, and today's total grows by the session just ended.
      const next = createSession(s.sessionNumber + 1, s.nextReelId, {
        entry: s.entry,
        dailyMinBefore: a.dailyMinBefore ?? s.dailyMinBefore + s.sessionMs / 60000,
        stillInDark: s.stillInDark,
        baseline: a.baseline ?? s.baseline,
        startedAt: a.startedAt ?? 0,
      });
      return { ...next, history: s.history };
    }

    case "answer":
      if (!s.askCheckIn || s.checkIn) return s;
      return {
        ...s,
        checkIn: a.answer,
        history: [...s.history, { session: s.sessionNumber, answer: a.answer }],
      };
  }
}
