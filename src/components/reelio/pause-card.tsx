import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoodFace } from "./mood-face";
import { formatInterruption } from "@/lib/drift";
import type { PauseItem } from "@/lib/session";

export function PauseCard({
  pause,
  active,
  onClose,
  onKeepGoing,
  demo = false,
}: {
  pause: PauseItem;
  active: boolean;
  demo?: boolean;
  onClose: () => void;
  onKeepGoing: () => void;
}) {
  const { headline, sub, note } = formatInterruption(
    pause.sessionMs,
    pause.reels,
    pause.entry,
    demo,
  );
  const [remaining, setRemaining] = useState(pause.waitMs);

  useEffect(() => {
    if (!active || pause.waitMs <= 0) return;
    const started = performance.now();
    setRemaining(pause.waitMs);
    const id = window.setInterval(() => {
      const left = Math.max(0, pause.waitMs - (performance.now() - started));
      setRemaining(left);
      if (left === 0) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [active, pause.waitMs]);

  const locked = remaining > 0;
  const seconds = Math.ceil(remaining / 1000);
  const progress = pause.waitMs ? 1 - remaining / pause.waitMs : 1;

  return (
    <div className="bg-reelio relative flex h-full w-full flex-col items-center justify-between px-6 pb-12 pt-16 text-center font-nunito text-r-ink">
      <div className="flex w-full flex-col items-center">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-r-hooked">
            <span className="size-2.5 rounded-full border-2 border-white/85" />
          </span>
          <span className="font-grotesk text-[15px] font-bold">Reelio</span>
        </div>
        <div className="notch mt-6 w-full rounded-[22px] bg-r-hooked-bg px-5 pb-6 pt-5">
          <div className="relative mx-auto grid size-28 place-items-center">
            {pause.waitMs > 0 && (
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="47" fill="none" stroke="#E2DACB" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="#C4973A"
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
              <MoodFace score={60} size={86} />
            )}
          </div>
          <p className="mt-4 font-rmono text-[10px] font-bold uppercase tracking-[0.16em] text-r-hooked animate-rise">
            A small pause
          </p>
          <h2 className="mt-2 font-grotesk text-[30px] font-bold leading-[1.05] text-balance animate-rise [animation-delay:120ms]">
            {headline}
          </h2>
          <p className="mt-2 text-[16px] leading-snug text-r-mute animate-rise [animation-delay:240ms]">
            {sub}
          </p>
          {note && <p className="mt-3 text-[11px] text-r-mute/80">{note}</p>}
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5 animate-rise [animation-delay:360ms]">
        <p className="mb-1 h-5 text-[13px] text-r-mute" aria-live="polite">
          {locked
            ? `Take a breath · ${seconds}s`
            : pause.waitMs > 0
              ? "Whenever you're ready."
              : ""}
        </p>
        <Button
          size="pill"
          className="w-full bg-r-ink font-grotesk font-bold text-r-paper hover:bg-r-ink/90"
          disabled={locked}
          onClick={onClose}
        >
          Close Instagram
        </Button>
        <Button
          variant="ghost"
          size="pill"
          className="w-full font-grotesk font-bold text-r-mute"
          disabled={locked}
          onClick={onKeepGoing}
        >
          Keep going
        </Button>
      </div>
    </div>
  );
}
