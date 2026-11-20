// Ladder step 3: the full-screen pause, drawn over the (already grayscale) feed.
import { useEffect, useState } from "react";
import { MoodFace } from "./mood-face";
import { formatInterruption } from "@/lib/drift";
import type { PauseOverlay as Pause } from "@/lib/session";

const STEP_COLOURS = ["#9EB384", "#F7D1BA", "#E5C3C6"]; // sage, peach, blush: the app's calm scale

export function PauseOverlay({
  pause,
  onClose,
  onKeepGoing,
  demo = false,
}: {
  pause: Pause;
  demo?: boolean;
  onClose: () => void;
  onKeepGoing: () => void;
}) {
  const { headline, sub, note } = formatInterruption(pause.sessionMs, pause.reels, pause.entry, demo);
  const [remaining, setRemaining] = useState(pause.waitMs);

  useEffect(() => {
    if (pause.waitMs <= 0) return;
    const started = performance.now();
    setRemaining(pause.waitMs);
    const id = window.setInterval(() => {
      const left = Math.max(0, pause.waitMs - (performance.now() - started));
      setRemaining(left);
      if (left === 0) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [pause.id, pause.waitMs]);

  const locked = remaining > 0;
  const seconds = Math.ceil(remaining / 1000);
  const progress = pause.waitMs ? 1 - remaining / pause.waitMs : 1;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col animate-fade font-nunito text-r-charcoal"
      role="dialog"
      aria-modal="true"
      aria-label="Reelio pause"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* The feed stays visible, faintly, underneath: you are paused, not thrown out. */}
      <div className="absolute inset-0 bg-[#F5F1EA]/[0.93] backdrop-blur-xl" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgba(45,52,54,0.05) 1.2px, transparent 1.2px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative flex h-full flex-col px-5 pb-10 pt-14">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/reelio-logo-128.png" alt="" className="size-7 rounded-[7px] shadow-paper" />
            <span className="font-grotesk text-[15px] font-bold">Reelio</span>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Step 3 of 3">
            {STEP_COLOURS.map((c) => (
              <span key={c} className="h-1.5 w-5 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[26px] border-[1.5px] border-[rgba(26,22,18,0.06)] bg-r-card px-5 pb-5 pt-6 text-center shadow-paper-lift animate-rise">
          <div className="relative mx-auto grid size-28 place-items-center">
            {pause.waitMs > 0 && (
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="47" fill="none" stroke="#E4DED4" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="#B88A8E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={295}
                  strokeDashoffset={295 * (1 - progress)}
                  className="transition-[stroke-dashoffset] duration-100"
                />
              </svg>
            )}
            {locked ? (
              <span className="relative font-grotesk text-[40px] font-bold">{seconds}</span>
            ) : (
              <MoodFace score={55} size={88} />
            )}
          </div>

          <p className="mt-3 font-rmono text-[10px] font-bold uppercase tracking-[0.16em] text-r-blush-dark">
            Time for a break
          </p>
          <h2 className="mt-2 font-grotesk text-[30px] font-bold leading-[1.05] text-balance">
            {headline}
          </h2>
          <p className="mt-2 text-[16px] leading-snug text-r-ink2">{sub}</p>

          {pause.reasons.length > 0 && (
            <div className="mt-4 rounded-2xl bg-r-blush-soft px-3.5 py-3 text-left">
              <p className="font-rmono text-[9px] font-bold uppercase tracking-[0.14em] text-r-ink3">
                What Reelio noticed
              </p>
              <ul className="mt-1.5 space-y-1">
                {pause.reasons.map((r) => (
                  <li key={r} className="flex items-center gap-2 text-[13px] font-semibold">
                    <span className="size-1.5 shrink-0 rounded-full bg-r-blush-dark" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {note && <p className="mt-3 text-[11px] text-r-ink3">{note}</p>}
        </div>

        <div className="mt-auto flex flex-col gap-2.5 animate-rise [animation-delay:200ms]">
          <p className="h-5 text-center text-[13px] text-r-ink3" aria-live="polite">
            {locked ? `Wait ${seconds}s` : pause.waitMs > 0 ? "Your call." : ""}
          </p>
          <button
            type="button"
            disabled={locked}
            onClick={onClose}
            className="h-12 w-full rounded-full bg-r-charcoal font-grotesk text-[15px] font-bold text-r-paper shadow-paper transition-opacity disabled:opacity-40"
          >
            Close Instagram
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={onKeepGoing}
            className="h-11 w-full rounded-full font-grotesk text-[14px] font-bold text-r-ink2 transition-opacity disabled:opacity-40"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
