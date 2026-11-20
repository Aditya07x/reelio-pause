import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CHECK_IN_EVERY,
  DRIFT_THRESHOLD,
  ENTRIES,
  MIN_FEED_MS,
  STREAK_TO_INTERRUPT,
  driftMood,
  shouldCheckIn,
} from "@/lib/drift";
import { FACTORS, type Strength } from "@/lib/evidence";
import { reelsSeen } from "@/lib/session";
import type { ReelioSession } from "@/hooks/use-reelio-session";

const MOOD = {
  calm: {
    label: "Settled",
    stroke: "stroke-calm",
    bg: "bg-calm",
    text: "Scrolling looks intentional.",
  },
  drift: {
    label: "Drifting",
    stroke: "stroke-drift",
    bg: "bg-drift",
    text: "Picking up autopilot signals.",
  },
  deep: {
    label: "Deep drift",
    stroke: "stroke-deep",
    bg: "bg-deep",
    text: "This looks like doomscrolling.",
  },
} as const;

const STRENGTH: Record<Strength, string> = {
  strong: "strong evidence",
  moderate: "moderate evidence",
  weak: "weak evidence",
};

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function ScoreRing({ score }: { score: number }) {
  const mood = MOOD[driftMood(score)];
  const c = 2 * Math.PI * 42;
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="42" className="fill-none stroke-foreground/8" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r="42"
          className={cn("fill-none transition-all duration-700", mood.stroke)}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
        {/* threshold tick */}
        <circle
          cx="50"
          cy="50"
          r="42"
          className="fill-none stroke-foreground/40"
          strokeWidth="9"
          strokeDasharray={`0.8 ${c}`}
          strokeDashoffset={-c * (DRIFT_THRESHOLD / 100)}
        />
      </svg>
      <div className="text-center">
        <div className="font-soft text-[38px] font-light leading-none tabular-nums">{score}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          drift
        </div>
      </div>
    </div>
  );
}

export function DriftPanel({ session }: { session: ReelioSession }) {
  const {
    state,
    drift,
    currentDwellMs,
    idle,
    demoSpeed,
    setDemoSpeed,
    simulateNight,
    setSimulateNight,
    close,
    exportLog,
    setEntry,
    setDailyMinBefore,
    setStillInDark,
  } = session;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 640px)").matches);
  }, []);

  const mood = MOOD[driftMood(drift.score)];
  const live = state.phase === "feed";

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "z-40 rounded-[1.75rem] glass shadow-soft transition-all",
        "fixed right-3 top-[84px] w-[min(340px,calc(100vw-1.5rem))] max-sm:data-[state=closed]:w-auto max-sm:data-[state=open]:bg-card/95",
        "sm:static sm:w-[340px] sm:shrink-0",
      )}
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left no-tap-highlight">
        <span
          className={cn(
            "size-2.5 rounded-full transition-colors",
            mood.bg,
            live && "animate-pulse",
          )}
        />
        <span className="flex-1 font-soft text-[17px]">How it decides</span>
        <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-[13px] font-semibold tabular-nums">
          {drift.score}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="max-h-[calc(100svh-10rem)] sm:max-h-[calc(100svh-8rem)] overflow-y-auto px-5 pb-5 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
        <div className="flex items-center gap-4 border-t border-foreground/8 pt-4">
          <ScoreRing score={drift.score} />
          <div>
            <p className="font-soft text-[22px] font-light leading-tight">{mood.label}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              {live && idle ? "No swipes for a minute. The session clock is paused." : mood.text}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-foreground/[0.035] p-3.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">
              {DRIFT_THRESHOLD}+ for {STREAK_TO_INTERRUPT} reels in a row, after{" "}
              {MIN_FEED_MS / 60000} min
            </span>
            <span className="font-semibold tabular-nums">
              {state.streak}/{STREAK_TO_INTERRUPT}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: STREAK_TO_INTERRUPT }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-500",
                  i < state.streak ? "bg-deep" : "bg-foreground/10",
                )}
              />
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-muted-foreground">
            Next pause:{" "}
            <span className="font-medium text-foreground">
              {state.keptGoing ? "asks for a 5-second wait" : "can be closed right away"}
            </span>
          </p>
        </div>

        <ul className="mt-4 space-y-3.5">
          {drift.parts.map((p) => (
            <li key={p.key}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-medium">{p.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(p.points)}
                  <span className="opacity-60"> / {p.max}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/8">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", mood.bg)}
                  style={{ width: `${(p.points / p.max) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                <span className="text-[10px] uppercase tracking-[0.08em] opacity-75">
                  {STRENGTH[FACTORS.find((f) => f.key === p.key)!.strength]}
                </span>
                {" · "}
                {p.detail}
                {p.key === "skips" && live && ` · this one ${(currentDwellMs / 1000).toFixed(1)} s`}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Session", fmtTime(state.sessionMs)],
            ["Reels", String(reelsSeen(state))],
            [
              "Liked",
              String(state.engaged.filter(Boolean).length + (state.currentEngaged ? 1 : 0)),
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-foreground/[0.035] py-2.5">
              <div className="font-soft text-[18px] tabular-nums">{v}</div>
              <div className="text-[11px] text-muted-foreground">{k}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-foreground/8 pt-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Session context
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            A phone reads these passively, and only while you are on the Reels feed. Here you set
            them to see how the score reacts.
          </p>
          <label className="mt-3 block text-[13px]">
            How this session started
            <select
              className="mt-1.5 w-full rounded-xl border border-foreground/10 bg-card px-3 py-2 text-[13px]"
              value={state.entry}
              onChange={(e) => setEntry(e.target.value as (typeof ENTRIES)[number]["key"])}
            >
              {ENTRIES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 text-[13px]">
            Short video earlier today
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {[0, 30, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDailyMinBefore(m)}
                  className={cn(
                    "rounded-xl py-1.5 text-[12px] tabular-nums transition-colors",
                    Math.round(state.dailyMinBefore) === m
                      ? "bg-foreground text-background"
                      : "bg-foreground/[0.05] hover:bg-foreground/10",
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-foreground/8 pt-4">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-[14px]">
            <span>
              Demo speed ×10
              <span className="block text-[12px] text-muted-foreground">
                Session clock runs ten times faster
              </span>
            </span>
            <Switch
              checked={demoSpeed}
              onCheckedChange={setDemoSpeed}
              aria-label="Demo speed ×10"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-[14px]">
            <span>
              Pretend it's 11 pm
              <span className="block text-[12px] text-muted-foreground">
                Try the night signal (9 pm – 7 am)
              </span>
            </span>
            <Switch
              checked={simulateNight}
              onCheckedChange={setSimulateNight}
              aria-label="Pretend it's 11 pm"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-[14px]">
            <span>
              Lying still in a dark room
              <span className="block text-[12px] text-muted-foreground">
                What the motion and light sensors would report in bed
              </span>
            </span>
            <Switch
              checked={state.stillInDark}
              onCheckedChange={setStillInDark}
              aria-label="Lying still in a dark room"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
          <span>
            Session {state.sessionNumber} ·{" "}
            {shouldCheckIn(state.sessionNumber)
              ? "will ask if it was well spent"
              : `asks “well spent?” 1 in ${CHECK_IN_EVERY}`}
          </span>
          {live && (
            <Button
              variant="whisper"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3"
              onClick={close}
            >
              End session
            </Button>
          )}
        </div>
        <Link
          to="/assumptions"
          className="mt-3 block text-[12px] font-medium text-foreground underline underline-offset-2"
        >
          What it assumes, and the research behind each factor →
        </Link>
        {state.events.length > 0 && (
          <button
            type="button"
            onClick={exportLog}
            className="mt-2 text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Download this session's log ({state.events.length} cards)
          </button>
        )}
        {state.history.length > 0 && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Check-ins:{" "}
            {state.history
              .map((h) => `#${h.session} ${h.answer === "yes" ? "well spent" : "not really"}`)
              .join(", ")}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
