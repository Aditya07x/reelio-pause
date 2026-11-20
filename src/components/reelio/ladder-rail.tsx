// The three interventions, shown beside the feed so a viewer can see each one switch on.
import type { ReelioSession } from "@/hooks/use-reelio-session";
import { earliestLevelMs, LADDER, MIN_FEED_MS, type Level } from "@/lib/drift";
import { cn } from "@/lib/utils";

const TONE: Record<1 | 2 | 3, { fill: string; soft: string; dark: string }> = {
  1: { fill: "#9EB384", soft: "#F0F4EC", dark: "#6B8252" }, // sage
  2: { fill: "#F7D1BA", soft: "#FAF2EC", dark: "#C99A7F" }, // peach
  3: { fill: "#E5C3C6", soft: "#FAF0F2", dark: "#B88A8E" }, // blush
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

type Status = "waiting" | "on" | "lifted";

function statusOf(level: 1 | 2 | 3, current: Level, ladder: ReelioSession["state"]["ladder"]) {
  const turnedOn = ladder.filter((l) => l.level === level).at(-1);
  const status: Status = current >= level ? "on" : turnedOn ? "lifted" : "waiting";
  return { status, at: turnedOn?.atMs };
}

export function LadderRail({
  session,
  layout = "column",
}: {
  session: ReelioSession;
  layout?: "column" | "row";
}) {
  const { state } = session;
  const live = state.phase === "feed";
  const untilFloor = MIN_FEED_MS - state.sessionMs;

  if (layout === "row") {
    return (
      <div className="mb-3 flex w-full max-w-[420px] gap-1.5 px-3 font-nunito">
        {LADDER.map((step) => {
          const { status } = statusOf(step.level, state.level, state.ladder);
          const tone = TONE[step.level];
          return (
            <div
              key={step.level}
              className={cn(
                "flex flex-1 items-center gap-1.5 rounded-full border-[1.5px] px-2 py-1 transition-all duration-700",
                status === "lifted" && "opacity-60",
              )}
              style={{
                background: status === "on" ? tone.soft : "#FAF8F5",
                borderColor: status === "on" ? tone.fill : "rgba(26,22,18,0.06)",
                boxShadow: status === "on" ? `0 0 14px ${tone.fill}` : "none",
              }}
            >
              <span
                className="grid size-4 shrink-0 place-items-center rounded-full font-grotesk text-[9px] font-bold"
                style={{ background: status === "on" ? tone.fill : "#E4DED4", color: "#2D3436" }}
              >
                {step.level}
              </span>
              <span
                className={cn(
                  "truncate font-grotesk text-[11px] font-bold text-[#2D3436]",
                  status === "lifted" && "line-through",
                )}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="w-[210px] shrink-0 font-nunito text-[#2D3436]" aria-label="Reelio's interventions">
      <div className="mb-3 flex items-center gap-2">
        <img src="/reelio-logo-128.png" alt="" className="size-6 rounded-[6px] shadow-paper" />
        <span className="font-rmono text-[10px] font-bold uppercase tracking-[0.14em] text-[#7F8C8D]">
          What Reelio does
        </span>
      </div>

      <ol className="space-y-2.5">
        {LADDER.map((step) => {
          const { status, at } = statusOf(step.level, state.level, state.ladder);
          const tone = TONE[step.level];
          const on = status === "on";
          return (
            <li
              key={step.level}
              className={cn(
                "relative rounded-[18px] border-[1.5px] px-3.5 py-3 transition-all duration-700",
                on && "animate-chip",
              )}
              style={{
                background: on ? tone.soft : "#FDFAF6",
                borderColor: on ? tone.fill : "rgba(26,22,18,0.06)",
                boxShadow: on
                  ? `0 0 0 3px ${tone.fill}55, 0 0 28px ${tone.fill}, 0 8px 24px -6px rgba(45,52,54,0.12)`
                  : "0 4px 16px -2px rgba(45,52,54,0.07)",
              }}
            >
              <div className="flex items-center gap-2">
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
              </div>
              <p
                className={cn(
                  "mt-1.5 text-[11.5px] leading-snug text-[#545B5E]",
                  status === "lifted" && "line-through opacity-60",
                )}
              >
                {SHORT[step.level]}
              </p>
              <p
                className="mt-1.5 font-rmono text-[9.5px] font-bold uppercase tracking-[0.1em]"
                style={{ color: on ? tone.dark : "#7F8C8D" }}
              >
                {on
                  ? `On · since ${mmss(at ?? 0)}`
                  : status === "lifted"
                    ? "Lifted · you slowed down"
                    : `Earliest at ${mmss(earliestLevelMs(step.level))}`}
              </p>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[11px] leading-snug text-[#7F8C8D]">
        {!live
          ? "Session ended."
          : untilFloor > 0
            ? `Nothing can happen for the first 10 minutes. ${mmss(untilFloor)} to go.`
            : "Past 10 minutes: steps start only if the score stays high for 5 reels."}
      </p>
    </aside>
  );
}
