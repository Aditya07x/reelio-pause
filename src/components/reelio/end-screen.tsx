import { LADDER, TYPICAL_SESSION_SEC } from "@/lib/drift";
import type { CheckInAnswer, SessionState } from "@/lib/session";

export function EndScreen({
  state,
  onAnswer,
  onReopen,
}: {
  state: SessionState;
  onAnswer: (a: CheckInAnswer) => void;
  onReopen: () => void;
}) {
  const minutes = state.summary ? Math.max(1, Math.round(state.summary.ms / 60000)) : 0;
  const reels = state.summary?.reels ?? 0;
  const steps = LADDER.filter((s) => s.level <= state.peakLevel).map((s) => s.name.toLowerCase());

  return (
    <div className="bg-reelio-app flex h-full w-full flex-col items-center justify-between px-6 pb-12 pt-24 text-center font-nunito text-r-charcoal">
      <div className="flex flex-col items-center">
        <p className="font-rmono text-[10px] font-bold uppercase tracking-[0.16em] text-r-ink3 animate-rise">
          Feed closed
        </p>
        <h2 className="mt-4 font-grotesk text-[36px] font-bold leading-[1.05] animate-rise [animation-delay:100ms]">
          {minutes} min, {reels} reels
        </h2>
        <p className="mt-3 max-w-[280px] text-[14px] leading-snug text-r-ink2 animate-rise [animation-delay:200ms]">
          {steps.length > 0
            ? `Reelio stepped in: ${steps.join(", then ")}.`
            : `A typical social media session is about ${Math.round((TYPICAL_SESSION_SEC / 60) * 10) / 10} min.`}
        </p>
      </div>

      {state.askCheckIn && (
        <div className="w-full rounded-[26px] border-[1.5px] border-[rgba(26,22,18,0.06)] bg-r-card p-5 shadow-paper-lift animate-rise [animation-delay:350ms]">
          {state.checkIn ? (
            <p className="py-3 font-grotesk text-[18px] font-bold">Noted. Thanks.</p>
          ) : (
            <>
              <p className="font-grotesk text-[20px] font-bold leading-tight">
                Was that time well spent?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onAnswer("yes")}
                  className="h-11 rounded-full bg-r-sage-soft font-grotesk text-[14px] font-bold text-r-sage-dark hover:brightness-95"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => onAnswer("no")}
                  className="h-11 rounded-full bg-r-blush-soft font-grotesk text-[14px] font-bold text-r-blush-dark hover:brightness-95"
                >
                  Not really
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onReopen}
        className="h-11 rounded-full px-6 font-grotesk text-[14px] font-bold text-r-blue-dark animate-rise [animation-delay:450ms] hover:bg-r-blue-soft"
      >
        Open the feed again
      </button>
    </div>
  );
}
