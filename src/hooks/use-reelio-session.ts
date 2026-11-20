import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { computeDrift, DEMO_SPEED, IDLE_MS, type EntryContext } from "@/lib/drift";
import { canStep, createSession, sessionReducer, type CheckInAnswer } from "@/lib/session";

const LATE_NIGHT_HOUR = 23;

export function useReelioSession() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => createSession(1));
  const [demoSpeed, setDemoSpeed] = useState(false);
  const [simulateNight, setSimulateNight] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [currentDwellMs, setCurrentDwellMs] = useState(0);
  const [idle, setIdle] = useState(false);

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
  const close = useCallback(() => dispatch({ type: "close" }), []);
  const start = useCallback(() => {
    dispatch({ type: "start" });
    resetDwell();
  }, []);
  const answer = useCallback((a: CheckInAnswer) => dispatch({ type: "answer", answer: a }), []);
  /** Like / save / share on the reel on screen: active use, which lowers the passive-watching factor. */
  const engage = useCallback((id: number) => {
    markActive();
    dispatch({ type: "engage", id });
  }, []);
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

  /** Download this session's per-card events as JSON (the same fields the Android app logs per reel). */
  const exportLog = useCallback(() => {
    const s = stateRef.current;
    const blob = new Blob(
      [
        JSON.stringify(
          { session: s.sessionNumber, demoSpeed: speedRef.current, events: s.events },
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
    close,
    start,
    answer,
    engage,
    setEntry,
    setDailyMinBefore,
    setStillInDark,
    exportLog,
  };
}

export type ReelioSession = ReturnType<typeof useReelioSession>;
