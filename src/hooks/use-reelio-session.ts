import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  computeBaseline,
  minutesToday,
  sampleHistory,
  type SamplePersona,
  type SessionSummary,
} from "@/lib/baseline";
import { computeDrift, DEMO_SPEED, IDLE_MS, isFastSwipe, type EntryContext } from "@/lib/drift";
import {
  canStep,
  createSession,
  reelsSeen,
  sessionReducer,
  type CheckInAnswer,
  type SessionState,
} from "@/lib/session";
import { driversFrom } from "@/lib/reelio-payload";
import { stateFor } from "@/lib/states";
import type { DriftResult } from "@/lib/drift";

const HISTORY_KEY = "reelio-history-v1";

function loadHistory(): SessionSummary[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as SessionSummary[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(h: SessionSummary[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-400)));
  } catch {
    /* storage may be unavailable; history then lives only in memory */
  }
}

/** Turn a finished session into the summary Reelio keeps (no content, just behaviour). */
export function summarise(
  s: SessionState,
  id: number,
  now: number,
  drift?: DriftResult,
  lastEnd?: number | null,
): SessionSummary {
  const n = s.dwells.length;
  const minutes = s.sessionMs / 60000;
  return {
    id,
    startedAt: s.startedAt || now - s.sessionMs,
    minutes: Math.round(minutes * 10) / 10,
    reels: reelsSeen(s),
    skipRate: n ? s.dwells.filter(isFastSwipe).length / n : 0,
    interactionRate: n ? s.engaged.filter(Boolean).length / n : 0,
    hour: new Date(now).getHours(),
    entry: s.entry,
    peakScore: s.peakScore,
    state: stateFor(s.peakScore).key,
    pauses: s.pauseCount,
    checkIn: null,
    drivers: drift
      ? driversFrom(
          drift.parts,
          s,
          lastEnd ? Math.max(0, ((s.startedAt || now - s.sessionMs) - lastEnd) / 60000) : null,
        )
      : undefined,
  };
}

export function lastEndOf(h: SessionSummary[]) {
  const l = h.at(-1);
  return l ? l.startedAt + l.minutes * 60000 : null;
}

const LATE_NIGHT_HOUR = 23;

export function useReelioSession() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => createSession(1));
  const [demoSpeed, setDemoSpeed] = useState(false);
  const [simulateNight, setSimulateNight] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [currentDwellMs, setCurrentDwellMs] = useState(0);
  const [idle, setIdle] = useState(false);
  const [history, setHistoryState] = useState<SessionSummary[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;
  const baseline = useMemo(() => computeBaseline(history), [history]);

  const setHistory = useCallback((h: SessionSummary[]) => {
    setHistoryState(h);
    saveHistory(h);
  }, []);

  // Load this browser's history after mount (never during server render).
  useEffect(() => {
    const h = loadHistory();
    setHistoryState(h);
    dispatch({
      type: "setContext",
      baseline: computeBaseline(h),
      dailyMinBefore: minutesToday(h),
    });
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;
  const speedRef = useRef(1);
  speedRef.current = demoSpeed ? DEMO_SPEED : 1;
  const enteredAt = useRef(0);
  // Last swipe or button press, in real time. Used to stop the session clock when nobody is scrolling.
  const lastActivity = useRef(0);

  const realHour = now ? now.getHours() : null;
  const hour = simulateNight ? LATE_NIGHT_HOUR : realHour;
  const hourRef = useRef(hour);
  hourRef.current = hour;

  useEffect(() => {
    let last = performance.now();
    enteredAt.current = last;
    lastActivity.current = last;
    setNow(new Date());
    const id = window.setInterval(() => {
      const t = performance.now();
      const dt = t - last;
      last = t;
      const isIdle = t - lastActivity.current > IDLE_MS;
      setIdle(isIdle);
      // While idle the clock stands still: session length should count scrolling, not a phone on a desk.
      dispatch({ type: "tick", dtMs: dt, speed: isIdle ? 0 : speedRef.current });
      setCurrentDwellMs(t - enteredAt.current);
      setNow(new Date());
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const markActive = () => {
    const t = performance.now();
    lastActivity.current = t;
    setIdle(false);
    return t;
  };

  const resetDwell = () => {
    enteredAt.current = markActive();
    setCurrentDwellMs(0);
  };

  const step = useCallback((dir: 1 | -1) => {
    if (!canStep(stateRef.current, dir)) return false;
    const t = markActive();
    dispatch({
      type: "step",
      dir,
      dwellMs: t - enteredAt.current,
      hour: hourRef.current,
      at: Date.now(),
    });
    enteredAt.current = t;
    setCurrentDwellMs(0);
    return true;
  }, []);

  const keepGoing = useCallback(() => {
    dispatch({ type: "keepGoing" });
    resetDwell();
  }, []);
  const close = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "feed" && reelsSeen(s) > 1) {
      const h = historyRef.current;
      const next = [
        ...h,
        summarise(s, (h.at(-1)?.id ?? 0) + 1, Date.now(), driftRef.current, lastEndOf(h)),
      ];
      setHistory(next);
    }
    dispatch({ type: "close" });
  }, [setHistory]);
  const start = useCallback(() => {
    const h = historyRef.current;
    dispatch({
      type: "start",
      baseline: computeBaseline(h),
      dailyMinBefore: minutesToday(h),
      startedAt: Date.now(),
    });
    resetDwell();
  }, []);
  const answer = useCallback(
    (a: CheckInAnswer) => {
      dispatch({ type: "answer", answer: a });
      // The answer belongs to the session that just closed; it tunes the threshold for the next one.
      const h = historyRef.current;
      if (h.length) setHistory([...h.slice(0, -1), { ...h.at(-1)!, checkIn: a }]);
    },
    [setHistory],
  );
  /** Replace history with 14 days of a synthetic sample user, to watch the baseline adapt. */
  const loadSample = useCallback(
    (p: SamplePersona) => {
      const h = sampleHistory(p);
      setHistory(h);
      dispatch({
        type: "setContext",
        baseline: computeBaseline(h),
        dailyMinBefore: minutesToday(h),
      });
    },
    [setHistory],
  );
  const clearHistory = useCallback(() => {
    setHistory([]);
    dispatch({ type: "setContext", baseline: computeBaseline([]), dailyMinBefore: 0 });
  }, [setHistory]);
  /** Like / save / share on the reel on screen: active use, which lowers the passive-watching factor. */
  const engage = useCallback((id: number) => {
    markActive();
    dispatch({ type: "engage", id });
  }, []);
  /** Demo: switch on the next ladder step by hand (1, then 2, then 3). */
  const forceLevel = useCallback((level: 1 | 2 | 3) => {
    dispatch({ type: "forceLevel", level, hour: hourRef.current });
    markActive();
  }, []);
  const resetLadder = useCallback(() => dispatch({ type: "resetLadder" }), []);

  const setEntry = useCallback(
    (entry: EntryContext) => dispatch({ type: "setContext", entry }),
    [],
  );
  const setStillInDark = useCallback(
    (stillInDark: boolean) => dispatch({ type: "setContext", stillInDark }),
    [],
  );
  const setDailyMinBefore = useCallback(
    (dailyMinBefore: number) => dispatch({ type: "setContext", dailyMinBefore }),
    [],
  );

  const onReel = state.phase === "feed" && state.items[state.index]?.kind === "reel";
  const drift = useMemo(
    () =>
      computeDrift({
        sessionMs: state.sessionMs,
        dwellsMs: state.dwells,
        engaged: state.engaged,
        hour,
        entry: state.entry,
        dailyMinBefore: state.dailyMinBefore,
        stillInDark: state.stillInDark,
        baseline: state.baseline,
        currentDwellMs: onReel ? currentDwellMs : 0,
      }),
    [
      state.sessionMs,
      state.dwells,
      state.engaged,
      state.entry,
      state.dailyMinBefore,
      state.stillInDark,
      hour,
      onReel,
      currentDwellMs,
    ],
  );

  const driftRef = useRef(drift);
  driftRef.current = drift;

  /** Download this session's per-card events as JSON (the same fields the Android app logs per reel). */
  const exportLog = useCallback(() => {
    const s = stateRef.current;
    const blob = new Blob(
      [
        JSON.stringify(
          { session: s.sessionNumber, demoSpeed: speedRef.current, ladder: s.ladder, events: s.events },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reelio-session-${s.sessionNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const clock = useMemo(() => {
    if (!now) return "";
    const d = new Date(now);
    if (simulateNight) d.setHours(LATE_NIGHT_HOUR);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [now, simulateNight]);

  return {
    state,
    drift,
    currentDwellMs,
    idle,
    clock,
    demoSpeed,
    setDemoSpeed,
    simulateNight,
    setSimulateNight,
    step,
    keepGoing,
    forceLevel,
    resetLadder,
    close,
    start,
    answer,
    engage,
    setEntry,
    setDailyMinBefore,
    setStillInDark,
    exportLog,
    history,
    baseline,
    loadSample,
    clearHistory,
  };
}

export type ReelioSession = ReturnType<typeof useReelioSession>;
