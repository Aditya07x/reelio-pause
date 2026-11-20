import { Button } from "@/components/ui/button";
import { TYPICAL_SESSION_SEC } from "@/lib/drift";
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

  return (
    <div className="bg-reelio flex h-full w-full flex-col items-center justify-between px-6 pb-12 pt-24 text-center font-nunito text-r-ink">
      <div className="flex flex-col items-center">
        <p className="font-rmono text-[10px] font-bold uppercase tracking-[0.16em] text-r-mute animate-rise">
          Feed closed
        </p>
        <h2 className="mt-4 font-grotesk text-[36px] font-bold leading-[1.05] animate-rise [animation-delay:100ms]">
          {minutes} min, {reels} reels
        </h2>
        <p className="mt-3 text-[14px] text-r-mute animate-rise [animation-delay:200ms]">
          {state.pauseCount > 0
            ? `Reelio paused you ${state.pauseCount === 1 ? "once" : `${state.pauseCount} times`}.`
            : `A typical social media session is about ${Math.round((TYPICAL_SESSION_SEC / 60) * 10) / 10} min.`}
        </p>
      </div>

      {state.askCheckIn && (
        <div className="notch w-full rounded-[22px] bg-r-paper p-5 animate-rise [animation-delay:350ms]">
          {state.checkIn ? (
            <p className="py-3 font-grotesk text-[18px] font-bold">Noted. Thank you.</p>
          ) : (
            <>
              <p className="font-grotesk text-[20px] font-bold leading-tight">
                Was that time well spent?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="whisper" size="pill" onClick={() => onAnswer("yes")}>
                  Yes
                </Button>
                <Button variant="whisper" size="pill" onClick={() => onAnswer("no")}>
                  Not really
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <Button
        variant="quiet"
        size="pill"
        onClick={onReopen}
        className="animate-rise [animation-delay:450ms]"
      >
        Open the feed again
      </Button>
    </div>
  );
}
