import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useClips } from "@/lib/clips";
import { reelFor } from "@/lib/feed";
import {
  dragFollowFor,
  FLICK_PX_PER_MS,
  slideMsFor,
  swipeShareFor,
  type Level,
} from "@/lib/drift";
import type { ReelioSession } from "@/hooks/use-reelio-session";
import { PauseOverlay } from "./pause-overlay";
import { ReelCard } from "./reel-card";
import { MoodFace } from "./mood-face";

/** Short drags under this are treated as taps, never as swipes. */
const MIN_FLICK_PX = 24;

/** Small Reelio chip at the top of the feed while step 1 or 2 is on. */
function LadderChip({ level, minutes }: { level: Level; minutes: number }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
    const id = window.setTimeout(() => setOpen(false), 4500);
    return () => window.clearTimeout(id);
  }, [level]);
  if (level < 1) return null;

  const tone =
    level === 1
      ? { dot: "#9EB384", bg: "#F0F4EC" }
      : level === 2
        ? { dot: "#C99A7F", bg: "#FAF2EC" }
        : { dot: "#B88A8E", bg: "#FAF0F2" };
  const title = level === 1 ? "Scrolling slowed" : `${minutes} min in Reels`;
  const detail =
    level === 1
      ? "You've been skipping fast for a while. Swipes take a little more effort now."
      : level === 2
        ? "Colour is off for now. It comes back when you slow down."
        : "If this keeps up, Reelio pauses again in 5 minutes.";

  return (
    <div
      key={level}
      className="pointer-events-none absolute inset-x-0 top-[86px] z-20 flex justify-center px-4 animate-chip"
      aria-live="polite"
    >
      <div
        className="flex max-w-full items-center gap-2.5 rounded-[18px] border-[1.5px] border-[rgba(26,22,18,0.06)] py-1.5 pl-1.5 pr-3.5 font-nunito text-[#2D3436] shadow-paper-lift transition-all duration-500"
        style={{ background: tone.bg }}
      >
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white/70">
          {level >= 2 ? (
            <MoodFace score={level === 2 ? 55 : 72} size={30} />
          ) : (
            <span className="size-2.5 rounded-full" style={{ background: tone.dot }} />
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-grotesk text-[13px] font-bold leading-tight">
            Reelio · {title}
          </span>
          {open && (
            <span className="block max-w-[240px] text-[11.5px] leading-snug text-[#545B5E] animate-fade">
              {detail}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function Feed({ session }: { session: ReelioSession }) {
  const { state, step, keepGoing, close, demoSpeed, engage } = session;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelAcc = useRef(0);
  const wheelLock = useRef(0);
  const keyLock = useRef(0);
  const clips = useClips();
  const level = state.level;
  const blocked = state.overlay !== null;

  const levelRef = useRef(level);
  levelRef.current = level;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const indexRef = useRef(state.index);
  indexRef.current = state.index;

  // Keyboard: arrows / page keys / j k. With friction on, at most one reel per slide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      const dir = ["ArrowDown", "PageDown", "j"].includes(e.key)
        ? 1
        : ["ArrowUp", "PageUp", "k"].includes(e.key)
          ? -1
          : 0;
      if (!dir) return;
      e.preventDefault();
      const t = performance.now();
      if (t < keyLock.current) return;
      if (step(dir)) keyLock.current = t + (levelRef.current >= 1 ? slideMsFor(1) : 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (blockedRef.current || (e.target as HTMLElement).closest("button")) return;
    const el = rootRef.current;
    if (!el) return;
    // The phone is drawn scaled down; convert screen pixels back to phone pixels.
    const scale = el.getBoundingClientRect().height / el.offsetHeight || 1;
    const height = el.offsetHeight;
    const y0 = e.clientY;
    const samples: { y: number; t: number }[] = [{ y: y0, t: performance.now() }];
    setDragging(true);

    const move = (ev: PointerEvent) => {
      let dy = (ev.clientY - y0) / scale;
      // Rubber band at the top of the feed.
      if (dy > 0 && indexRef.current === 0) dy *= 0.3;
      setOffset(dy * dragFollowFor(levelRef.current));
      samples.push({ y: ev.clientY, t: performance.now() });
      if (samples.length > 6) samples.shift();
    };
    const up = (ev: PointerEvent) => {
      const dy = (ev.clientY - y0) / scale;
      const now = performance.now();
      const first = samples.find((s) => now - s.t < 120) ?? samples[0]!;
      const velocity = (ev.clientY - first.y) / scale / Math.max(1, now - first.t); // px/ms
      setDragging(false);
      setOffset(0);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);

      const lvl = levelRef.current;
      const far = Math.abs(dy) >= height * swipeShareFor(lvl);
      // A quick flick works like Instagram, except while friction is on.
      const flick =
        lvl === 0 && Math.abs(dy) >= MIN_FLICK_PX && Math.abs(velocity) >= FLICK_PX_PER_MS;
      if (!far && !flick) return;
      step(dy < 0 ? 1 : -1);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // Trackpad / mouse wheel: one reel per gesture, heavier when friction is on.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (blockedRef.current) return;
      const t = performance.now();
      if (t < wheelLock.current) return;
      wheelAcc.current += e.deltaY;
      const heavy = levelRef.current >= 1;
      if (Math.abs(wheelAcc.current) > (heavy ? 140 : 40)) {
        step(wheelAcc.current > 0 ? 1 : -1);
        wheelAcc.current = 0;
        wheelLock.current = t + (heavy ? 1200 : 600);
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
      aria-label="Video feed. Swipe up for the next reel."
      aria-roledescription="feed"
    >
      <div
        className="absolute inset-0 transition-[filter] duration-[2500ms] ease-out"
        style={{ filter: level >= 2 ? "grayscale(1) contrast(0.92)" : "none" }}
      >
        {state.items.map((item, i) => {
          const rel = i - state.index;
          if (rel < -1 || rel > 1) return null;
          return (
            <div
              key={`reel-${item.id}`}
              className="absolute inset-0 will-change-transform"
              style={{
                transform: `translate3d(0, calc(${rel * 100}% + ${offset}px), 0)`,
                transition: dragging
                  ? "none"
                  : `transform ${slideMsFor(level)}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
              aria-hidden={rel !== 0}
            >
              <ReelCard
                reel={reelFor(item.id, clips)}
                active={rel === 0 && !blocked}
                liked={state.likedIds.includes(item.id)}
                onEngage={rel === 0 && !blocked ? engage : undefined}
              />
            </div>
          );
        })}
      </div>

      {!blocked && <LadderChip level={level} minutes={Math.round(state.sessionMs / 60000)} />}

      {state.overlay && (
        <PauseOverlay
          key={state.overlay.id}
          pause={state.overlay}
          demo={demoSpeed}
          onClose={close}
          onKeepGoing={keepGoing}
        />
      )}
    </div>
  );
}
