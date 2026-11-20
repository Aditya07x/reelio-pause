// Beside the Reels phone: the live score, and the three interventions as buttons.
// Steps switch on by themselves when the detector decides, or by hand for the demo,
// strictly in order (1, then 2, then 3).
import type { ReelioSession } from "@/hooks/use-reelio-session";
import { earliestLevelMs, LADDER, thresholdFor } from "@/lib/drift";
import { stateFor } from "@/lib/states";
import { cn } from "@/lib/utils";

const TONE: Record<1 | 2 | 3, { fill: string; soft: string; dark: string }> = {
  1: { fill: "#9EB384", soft: "#F0F4EC", dark: "#5A6E45" }, // sage
  2: { fill: "#F7D1BA", soft: "#FAF2EC", dark: "#8A6650" }, // peach
  3: { fill: "#E5C3C6", soft: "#FAF0F2", dark: "#8A5E62" }, // blush
};

const SHORT: Record<1 | 2 | 3, string> = {
  1: "Swipes need ⅔ of the screen; reels slide in slower",
  2: "Reels turn grayscale",
  3: "A pause screen covers the feed",
};

function mmss(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Status = "on" | "next" | "locked" | "lifted";

function stepInfo(level: 1 | 2 | 3, s: ReelioSession["state"]) {
  const last = s.ladder.filter((l) => l.level === level).at(-1);
  const live = s.phase === "feed" && !s.overlay;
  let status: Status;
  if (s.level >= level) status = "on";
  else if (level === s.level + 1) status = "next";
  else if (s.peakLevel >= level) status = "lifted";
  else status = "locked";
  // Step 3 can be shown again once its pause screen was dismissed.
  const canTap = live && (status === "next" || (level === 3 && s.level === 3));
  return { status, at: last?.atMs, manual: last?.manual ?? false, canTap };
}

/** Live score with the last 40 reels as a small line and the threshold marked. */
function ScoreCard({ session, compact = false }: { session: ReelioSession; compact?: boolean }) {
  const { drift, state } = session;
  const st = stateFor(drift.score);
  const threshold = thresholdFor(state.baseline);
  const pts = [...state.events.slice(-39).map((e) => e.score), drift.score];
  const W = 180;
  const H = 34;
  const xy = (v: number, i: number) =>
    `${pts.length > 1 ? (i / (pts.length - 1)) * W : W},${H - (v / 100) * H}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border-[1.5px] border-[rgba(26,22,18,0.06)] bg-[#FDFAF6] py-1 pl-1.5 pr-3 shadow-paper">
        <img src="/reelio-logo-128.png" alt="" className="size-6 rounded-[6px]" />
        <span className="font-rmono text-[9px] font-bold uppercase tracking-[0.1em] text-[#545B5E]">
          Live score
        </span>
        <span
          className="font-grotesk text-[18px] font-bold tabular-nums"
          style={{ color: st.accent }}
        >
          {drift.score}
        </span>
        <span
          className="font-rmono text-[9px] font-bold uppercase tracking-[0.1em]"
          style={{ color: st.accent }}
        >
          {st.label}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border-[1.5px] border-[rgba(26,22,18,0.06)] bg-[#FDFAF6] px-4 py-3.5 shadow-paper">
      <div className="flex items-center justify-between">
        <span className="font-rmono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#545B5E]">
          Live score
        </span>
        <span
          className="rounded-full px-2 py-0.5 font-grotesk text-[9.5px] font-bold uppercase tracking-[0.1em] transition-colors duration-700"
          style={{ color: st.accent, background: st.bg }}
        >
          {st.label}
        </span>
      </div>
      <div className="mt-1 flex items-end gap-2">
        <span
          className="font-grotesk text-[46px] font-bold leading-none tabular-nums transition-colors duration-700"
          style={{ color: st.accent }}
          aria-label={`Score ${drift.score} of 100`}
        >
          {drift.score}
        </span>
        <span className="mb-1.5 text-[11.5px] text-[#545B5E]">/ 100 · steps in at {threshold}+</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-[34px] w-full overflow-visible" aria-hidden="true">
        <line
          x1="0"
          x2={W}
          y1={H - (threshold / 100) * H}
          y2={H - (threshold / 100) * H}
          stroke="#B88A8E"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {pts.length > 1 && (
          <polyline
            points={pts.map(xy).join(" ")}
            fill="none"
            stroke={st.accent}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
      <p className="mt-1 text-[10.5px] text-[#6A6A6A]">Last 40 reels · dashed line is the threshold</p>
    </div>
  );
}

export function LadderRail({
  session,
  layout = "column",
}: {
  session: ReelioSession;
  layout?: "column" | "row";
}) {
  const { state, forceLevel, resetLadder, close, start } = session;
  const live = state.phase === "feed";
  const sessionButton = live ? (
    <button
      type="button"
      onClick={close}
      className="rounded-full bg-[#2D3436] px-3.5 py-1.5 font-grotesk text-[12px] font-bold text-[#FAF8F5] shadow-paper hover:bg-[#1A1612]"
    >
      End session
    </button>
  ) : (
    <button
      type="button"
      onClick={start}
      className="rounded-full bg-[#6E93A9] px-3.5 py-1.5 font-grotesk text-[12px] font-bold text-white shadow-paper hover:bg-[#5B7F95]"
    >
      Start a new session
    </button>
  );

  if (layout === "row") {
    return (
      <div className="mb-3 flex w-full max-w-[420px] flex-col items-center gap-2 px-3 font-nunito">
        <ScoreCard session={session} compact />
        <div className="flex w-full gap-1.5">
          {LADDER.map((step) => {
            const { status, canTap } = stepInfo(step.level, state);
            const tone = TONE[step.level];
            const on = status === "on";
            return (
              <button
                key={step.level}
                type="button"
                disabled={!canTap}
                onClick={() => forceLevel(step.level)}
                className={cn(
                  "flex min-h-9 flex-1 items-center gap-1.5 rounded-full border-[1.5px] px-2 py-1 text-left transition-all duration-700 disabled:cursor-default",
                  status === "locked" && "opacity-55",
                  status === "lifted" && "line-through opacity-60",
                )}
                style={{
                  background: on ? tone.soft : "#FAF8F5",
                  borderColor: on || status === "next" ? tone.fill : "rgba(26,22,18,0.06)",
                  borderStyle: status === "next" ? "dashed" : "solid",
                  boxShadow: on ? `0 0 14px ${tone.fill}` : "none",
                }}
              >
                <span
                  className="grid size-4 shrink-0 place-items-center rounded-full font-grotesk text-[9px] font-bold text-[#2D3436]"
                  style={{ background: on ? tone.fill : "#E4DED4" }}
                >
                  {step.level}
                </span>
                <span className="truncate font-grotesk text-[11px] font-bold text-[#2D3436]">
                  {step.name}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {sessionButton}
          {state.level > 0 && live && (
            <button
              type="button"
              onClick={resetLadder}
              className="text-[11px] font-semibold text-[#4F7389] underline underline-offset-2"
            >
              Switch all off
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <aside
      className="flex w-[210px] shrink-0 flex-col gap-3 font-nunito text-[#2D3436]"
      aria-label="Reelio's interventions"
    >
      <ScoreCard session={session} />

      <div>
        <div className="mb-1 flex items-center gap-2">
          <img src="/reelio-logo-128.png" alt="" className="size-5 rounded-[5px] shadow-paper" />
          <span className="font-rmono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#545B5E]">
            What Reelio does
          </span>
        </div>
        <p className="text-[11px] leading-snug text-[#6A6A6A]">
          Tap 1, then 2, then 3 to try each now, or keep scrolling and let Reelio decide.
        </p>
      </div>

      <ol className="flex flex-col gap-2.5">
        {LADDER.map((step) => {
          const { status, at, manual, canTap } = stepInfo(step.level, state);
          const tone = TONE[step.level];
          const on = status === "on";
          const hint = on
            ? step.level === 3 && canTap
              ? "On · tap to pause again"
              : `On${manual ? " by hand" : ""} · since ${mmss(at ?? 0)}`
            : status === "next"
              ? live
                ? "Tap to switch on"
                : `Earliest at ${mmss(earliestLevelMs(step.level))}`
              : status === "lifted"
                ? "Lifted · you slowed down"
                : `Switch on step ${step.level - 1} first`;
          return (
            <li key={step.level}>
              <button
                type="button"
                disabled={!canTap}
                onClick={() => forceLevel(step.level)}
                aria-label={`Step ${step.level}: ${step.name}. ${hint}`}
                className={cn(
                  "relative w-full rounded-[18px] border-[1.5px] px-3.5 py-3 text-left transition-all duration-700 disabled:cursor-default",
                  canTap && "hover:-translate-y-0.5 hover:shadow-paper-lift",
                  on && "animate-chip",
                  status === "locked" && "opacity-60",
                )}
                style={{
                  background: on ? tone.soft : "#FDFAF6",
                  borderColor: on || status === "next" ? tone.fill : "rgba(26,22,18,0.06)",
                  borderStyle: status === "next" ? "dashed" : "solid",
                  boxShadow: on
                    ? `0 0 0 3px ${tone.fill}55, 0 0 28px ${tone.fill}, 0 8px 24px -6px rgba(45,52,54,0.12)`
                    : "0 4px 16px -2px rgba(45,52,54,0.07)",
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="relative grid size-6 shrink-0 place-items-center rounded-full font-grotesk text-[12px] font-bold transition-colors duration-700"
                    style={{ background: on ? tone.fill : "#E4DED4" }}
                  >
                    {on && (
                      <span
                        className="absolute inset-0 animate-ping rounded-full opacity-60 [animation-iteration-count:3]"
                        style={{ background: tone.fill }}
                      />
                    )}
                    <span className="relative">{step.level}</span>
                  </span>
                  <span
                    className={cn(
                      "font-grotesk text-[14px] font-bold leading-tight",
                      status === "lifted" && "line-through decoration-2 opacity-60",
                    )}
                    style={status === "lifted" ? { textDecorationColor: tone.dark } : undefined}
                  >
                    {step.name}
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-1.5 block text-[11.5px] leading-snug text-[#545B5E]",
                    status === "lifted" && "line-through opacity-60",
                  )}
                >
                  {SHORT[step.level]}
                </span>
                <span
                  className="mt-1.5 block font-rmono text-[9.5px] font-bold uppercase tracking-[0.1em]"
                  style={{ color: on || status === "next" ? tone.dark : "#6A6A6A" }}
                >
                  {hint}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {state.level > 0 && live ? (
        <button
          type="button"
          onClick={resetLadder}
          className="self-start rounded-full border-[1.5px] border-[rgba(26,22,18,0.08)] bg-[#FDFAF6] px-3 py-1.5 font-grotesk text-[12px] font-bold text-[#2D3436] hover:bg-[#EBF2F7]"
        >
          Switch all off
        </button>
      ) : (
        <p className="text-[11px] leading-snug text-[#6A6A6A]">
          On its own, Reelio never steps in before 10 minutes in Reels.
        </p>
      )}

      <div className="flex flex-col gap-1.5 border-t border-[#E4DED4] pt-3">
        <div className="self-start">{sessionButton}</div>
        <p className="text-[11px] leading-snug text-[#6A6A6A]">
          {live
            ? `Session ${state.sessionNumber}. Ending it saves it to the Reelio app next door.`
            : "Saved. Open the Reelio app's sessions to find it."}
        </p>
      </div>
    </aside>
  );
}
