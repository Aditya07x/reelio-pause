import {
  computeDrift,
  interruptionWaitMs,
  nextStreak,
  shouldCheckIn,
  shouldInterrupt,
  type EntryContext,
} from "./drift";

export type ReelItem = { kind: "reel"; id: number };
export type PauseItem = {
  kind: "pause";
  id: string;
  waitMs: number;
  sessionMs: number;
  reels: number;
  entry: EntryContext;
};
export type FeedItem = ReelItem | PauseItem;

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
  lastPauseAtMs: number | null;
  /** How this session started: observed passively on a phone, chosen in the demo panel. */
  entry: EntryContext;
  /** Minutes already spent in short-video feeds today, before this session. */
  dailyMinBefore: number;
  /** Motion and light sensors agree the phone is held still in a dark room. */
  stillInDark: boolean;
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
  | { type: "setContext"; entry?: EntryContext; dailyMinBefore?: number; stillInDark?: boolean }
  | { type: "keepGoing" }
  | { type: "close" }
  | { type: "start" }
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
  context: { entry?: EntryContext; dailyMinBefore?: number; stillInDark?: boolean } = {},
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
    lastPauseAtMs: null,
    entry: context.entry ?? "home",
    dailyMinBefore: context.dailyMinBefore ?? 0,
    stillInDark: context.stillInDark ?? false,
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
  if (currentItem(s)?.kind === "pause") return false;
  if (dir < 0 && s.index === 0) return false;
  return true;
}

export function reelsSeen(s: SessionState) {
  return s.dwells.length + (currentItem(s)?.kind === "reel" ? 1 : 0);
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
      const { score } = computeDrift({
        sessionMs: s.sessionMs,
        dwellsMs: dwells,
        engaged,
        hour: a.hour,
        entry: s.entry,
        dailyMinBefore: s.dailyMinBefore,
        stillInDark: s.stillInDark,
      });
      let streak = nextStreak(s.streak, score);
      let items = s.items;
      let pauseCount = s.pauseCount;
      let lastPauseAtMs = s.lastPauseAtMs;
      if (a.dir > 0 && shouldInterrupt(streak, s.sessionMs, s.lastPauseAtMs)) {
        const pause: PauseItem = {
          kind: "pause",
          id: `pause-${s.sessionNumber}-${pauseCount}`,
          waitMs: interruptionWaitMs(s.keptGoing),
          sessionMs: s.sessionMs,
          reels: dwells.length,
          entry: s.entry,
        };
        items = [...items.slice(0, s.index + 1), pause, ...items.slice(s.index + 1)];
        streak = 0;
        pauseCount += 1;
        lastPauseAtMs = s.sessionMs;
      }
      const left = currentItem(s);
      const event: ReelEvent = {
        index: s.index,
        itemId: left?.kind === "reel" ? left.id : -1,
        dwellMs: Math.round(a.dwellMs),
        direction: a.dir > 0 ? "down" : "up",
        engaged: s.currentEngaged,
        sessionMs: Math.round(s.sessionMs),
        hour: a.hour,
        score,
        at: a.at ?? 0,
      };
      const index = s.index + a.dir;
      const look = withLookahead(items, index, s.nextReelId);
      return {
        ...s,
        ...look,
        index,
        dwells,
        engaged,
        currentEngaged: false,
        events: [...s.events, event],
        streak,
        pauseCount,
        lastPauseAtMs,
      };
    }

    case "engage": {
      if (s.phase !== "feed" || currentItem(s)?.kind !== "reel") return s;
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
      };

    case "keepGoing": {
      if (s.phase !== "feed" || currentItem(s)?.kind !== "pause") return s;
      const items = s.items.filter((_, i) => i !== s.index);
      const look = withLookahead(items, s.index, s.nextReelId);
      return { ...s, ...look, keptGoing: true };
    }

    case "close":
      if (s.phase !== "feed") return s;
      return {
        ...s,
        phase: "ended",
        summary: { ms: s.sessionMs, reels: reelsSeen(s) },
        askCheckIn: shouldCheckIn(s.sessionNumber),
        checkIn: null,
      };

    case "start": {
      // The next session inherits the entry choice, and today's total grows by the session just ended.
      const next = createSession(s.sessionNumber + 1, s.nextReelId, {
        entry: s.entry,
        dailyMinBefore: s.dailyMinBefore + s.sessionMs / 60000,
        stillInDark: s.stillInDark,
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
