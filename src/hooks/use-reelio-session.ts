import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { computeDrift, DEMO_SPEED } from "@/lib/drift";
import { canStep, createSession, sessionReducer, type CheckInAnswer } from "@/lib/session";

const LATE_NIGHT_HOUR = 1;

export function useReelioSession() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => createSession(1));
  const [demoSpeed, setDemoSpeed] = useState(false);
  const [simulateNight, setSimulateNight] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [currentDwellMs, setCurrentDwellMs] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  const speedRef = useRef(1);
  speedRef.current = demoSpeed ? DEMO_SPEED : 1;
  const enteredAt = useRef(0);

  const realHour = now ? now.getHours() : null;
  const hour = simulateNight ? LATE_NIGHT_HOUR : realHour;
  const hourRef = useRef(hour);
  hourRef.current = hour;

  useEffect(() => {
    let last = performance.now();
    enteredAt.current = last;
    setNow(new Date());
    const id = window.setInterval(() => {
      const t = performance.now();
      const dt = t - last;
      last = t;
      dispatch({ type: "tick", dtMs: dt, speed: speedRef.current });
      setCurrentDwellMs(t - enteredAt.current);
      setNow(new Date());
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    if (!canStep(stateRef.current, dir)) return false;
    const t = performance.now();
    dispatch({ type: "step", dir, dwellMs: t - enteredAt.current, hour: hourRef.current });
    enteredAt.current = t;
    setCurrentDwellMs(0);
    return true;
  }, []);

  const resetDwell = () => {
    enteredAt.current = performance.now();
    setCurrentDwellMs(0);
  };

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

  const drift = useMemo(
    () => computeDrift({ sessionMs: state.sessionMs, dwellsMs: state.dwells, hour }),
    [state.sessionMs, state.dwells, hour],
  );

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
  };
}

export type ReelioSession = ReturnType<typeof useReelioSession>;
