import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useClips } from "@/lib/clips";
import { reelFor } from "@/lib/feed";
import { currentItem } from "@/lib/session";
import type { ReelioSession } from "@/hooks/use-reelio-session";
import { PauseCard } from "./pause-card";
import { ReelCard } from "./reel-card";

const SWIPE_PX = 56;
const WHEEL_LOCK_MS = 650;

export function Feed({ session }: { session: ReelioSession }) {
  const { state, step, keepGoing, close, demoSpeed } = session;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const wheelAcc = useRef(0);
  const wheelLock = useRef(0);
  const blocked = currentItem(state)?.kind === "pause";
  const clips = useClips();

  // Keyboard: arrows / page keys / j k
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (["ArrowDown", "PageDown", "j"].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "PageUp", "k"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    startY.current = e.clientY;
    setDragging(true);
    const move = (ev: PointerEvent) => {
      if (startY.current === null) return;
      const dy = ev.clientY - startY.current;
      setOffset(blocked ? dy * 0.15 : dy);
    };
    const up = (ev: PointerEvent) => {
      const dy = startY.current === null ? 0 : ev.clientY - startY.current;
      startY.current = null;
      setDragging(false);
      setOffset(0);
      if (dy < -SWIPE_PX) step(1);
      else if (dy > SWIPE_PX) step(-1);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = performance.now();
      if (t < wheelLock.current) return;
      wheelAcc.current += e.deltaY;
      if (Math.abs(wheelAcc.current) > 40) {
        step(wheelAcc.current > 0 ? 1 : -1);
        wheelAcc.current = 0;
        wheelLock.current = t + WHEEL_LOCK_MS;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step]);

  return (
    <div
      className="relative h-full w-full touch-none overflow-hidden overscroll-none no-tap-highlight"
      ref={rootRef}
      onPointerDown={onPointerDown}
      aria-label="Video feed. Swipe up for the next card."
      aria-roledescription="feed"
    >
      {state.items.map((item, i) => {
        const rel = i - state.index;
        if (rel < -1 || rel > 1) return null;
        return (
          <div
            key={item.kind === "reel" ? `reel-${item.id}` : item.id}
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translate3d(0, calc(${rel * 100}% + ${offset}px), 0)`,
              transition: dragging ? "none" : "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            aria-hidden={rel !== 0}
          >
            {item.kind === "reel" ? (
              <ReelCard reel={reelFor(item.id, clips)} active={rel === 0} />
            ) : (
              <PauseCard
                pause={item}
                active={rel === 0}
                demo={demoSpeed}
                onClose={close}
                onKeepGoing={keepGoing}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
