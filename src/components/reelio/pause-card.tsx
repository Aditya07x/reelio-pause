import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="relative flex h-full w-full flex-col items-center justify-between bg-pause px-7 pb-12 pt-24 text-center">
      <div className="flex flex-col items-center">
        <div className="relative grid size-28 place-items-center">
          <span className="absolute inset-0 rounded-full bg-reel-rose/60 blur-xl animate-breathe" />
          <span className="absolute inset-4 rounded-full bg-reel-butter/80 animate-breathe [animation-delay:-1.2s]" />
          {pause.waitMs > 0 && (
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="46"
                className="fill-none stroke-foreground/10"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                className="fill-none stroke-foreground/60 transition-[stroke-dashoffset] duration-100"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={289}
                strokeDashoffset={289 * (1 - progress)}
              />
            </svg>
          )}
          {locked && <span className="relative font-soft text-3xl font-light">{seconds}</span>}
        </div>
        <p className="mt-8 text-[12px] font-medium uppercase tracking-[0.22em] text-muted-foreground animate-rise">
          A small pause
        </p>
        <h2 className="mt-4 font-soft text-[34px] font-light leading-[1.08] text-balance animate-rise [animation-delay:120ms]">
          {headline}
        </h2>
        <p className="mt-3 font-soft text-[20px] font-light italic text-muted-foreground animate-rise [animation-delay:240ms]">
          {sub}
        </p>
        {note && <p className="mt-3 text-[11px] text-muted-foreground/80">{note}</p>}
      </div>

      <div className="flex w-full flex-col gap-2.5 animate-rise [animation-delay:360ms]">
        <p className="mb-2 h-5 text-[13px] text-muted-foreground" aria-live="polite">
          {locked
            ? `Take a breath · ${seconds}s`
            : pause.waitMs > 0
              ? "Whenever you're ready."
              : ""}
        </p>
        <Button variant="calm" size="pill" className="w-full" disabled={locked} onClick={onClose}>
          Close
        </Button>
        <Button
          variant="quiet"
          size="pill"
          className="w-full"
          disabled={locked}
          onClick={onKeepGoing}
        >
          Keep going
        </Button>
      </div>
    </div>
  );
}
