// "How it decides": the detector's live working, styled as Reelio's engine readout.
import { Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import type { ReelioSession } from "@/hooks/use-reelio-session";
import {
  CHECK_IN_EVERY,
  ENTRIES,
  MIN_FEED_MS,
  STREAK_TO_INTERRUPT,
  shouldCheckIn,
  thresholdFor,
} from "@/lib/drift";
import { FACTORS, type Strength } from "@/lib/evidence";
import { reelsSeen } from "@/lib/session";
import { STATE_CUTS, stateFor } from "@/lib/states";
import { cn } from "@/lib/utils";

const STRENGTH: Record<Strength, string> = {
  strong: "strong evidence",
  moderate: "moderate evidence",
  weak: "weak evidence",
};

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-rmono text-[10px] font-bold uppercase tracking-[0.14em] text-r-mute",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Score ring with the four state bands and the person's pause threshold marked. */
function ScoreRing({ score, threshold }: { score: number; threshold: number }) {
  const st = stateFor(score);
  const r = 42;
  const c = 2 * Math.PI * r;
  const tick = (v: number, w = 0.9, color = "#1A1612") => (
    <circle
      cx="50"
      cy="50"
      r={r}
      fill="none"
      stroke={color}
      strokeWidth="10"
      strokeDasharray={`${w} ${c}`}
      strokeDashoffset={-c * (v / 100)}
      opacity={0.55}
    />
  );
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E2DACB" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={st.accent}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="transition-all duration-700"
        />
        {tick(STATE_CUTS.aware, 0.6, "#6A5E56")}
        {tick(STATE_CUTS.hooked, 0.6, "#6A5E56")}
        {tick(STATE_CUTS.doom, 0.6, "#6A5E56")}
        {tick(threshold, 1.6)}
      </svg>
      <div className="text-center">
        <div className="font-grotesk text-[34px] font-bold leading-none tabular-nums text-r-ink">
          {score}
        </div>
        <Mono className="mt-1 block text-[9px]">drift</Mono>
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
  const st = stateFor(drift.score);
  const live = state.phase === "feed";
  const threshold = thresholdFor(state.baseline);

  return (
    <section className="w-full rounded-[22px] bg-r-bg font-nunito text-r-ink shadow-[0_24px_60px_-30px_rgba(26,22,18,0.45)]">
      <header className="flex items-center gap-3 border-b border-r-line px-5 py-3.5">
        <span
          className={cn("size-2.5 rounded-full", live && "animate-pulse")}
          style={{ background: st.accent }}
        />
        <span className="flex-1 font-grotesk text-[17px] font-bold">How it decides</span>
        <Mono>engine v1</Mono>
      </header>

      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={drift.score} threshold={threshold} />
          <div>
            <span
              className="inline-block rounded-full border px-2.5 py-0.5 font-grotesk text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: st.accent, background: st.bg, borderColor: `${st.accent}55` }}
            >
              {st.label}
            </span>
            <p className="mt-2 font-grotesk text-[18px] font-bold leading-tight">{st.headline}</p>
            <p className="mt-1 text-[12px] leading-snug text-r-mute">
              {live && idle ? "No swipes for a minute. Session clock paused." : st.blurb}
            </p>
          </div>
        </div>

        <div className="notch rounded-[18px] bg-r-paper p-3.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-r-mute">
              Pause at {threshold}+ for {STREAK_TO_INTERRUPT} reels, after {MIN_FEED_MS / 60000} min
            </span>
            <span className="font-rmono font-bold tabular-nums">
              {state.streak}/{STREAK_TO_INTERRUPT}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: STREAK_TO_INTERRUPT }, (_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors duration-500"
                style={{ background: i < state.streak ? st.accent : "#E2DACB" }}
              />
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-r-mute">
            Next pause:{" "}
            <span className="font-bold text-r-ink">
              {state.keptGoing ? "asks for a 5-second wait" : "can be closed right away"}
            </span>
            {state.baseline.thresholdOffset !== 0 &&
              ` · threshold ${state.baseline.thresholdOffset > 0 ? "+" : ""}${state.baseline.thresholdOffset} from your check-ins`}
          </p>
          <div className="mt-2.5 flex justify-between font-rmono text-[9px] uppercase tracking-[0.1em] text-r-mute">
            <span style={{ color: "#3A9E6F" }}>mindful</span>
            <span style={{ color: "#6B3FA0" }}>aware {STATE_CUTS.aware}</span>
            <span style={{ color: "#C4973A" }}>hooked {STATE_CUTS.hooked}</span>
            <span style={{ color: "#C4563A" }}>doom {STATE_CUTS.doom}</span>
          </div>
        </div>

        <ul className="space-y-3">
          {drift.parts.map((p) => (
            <li key={p.key}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-grotesk font-bold">{p.label}</span>
                <span className="font-rmono text-[11px] tabular-nums text-r-mute">
                  {Math.round(p.points)}/{p.max}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-r-section">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(p.points / p.max) * 100}%`, background: st.accent }}
                />
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-r-mute">
                <Mono className="text-[9px] opacity-80">
                  {STRENGTH[FACTORS.find((f) => f.key === p.key)!.strength]}
                </Mono>{" "}
                · {p.detail}
                {p.key === "skips" && live && ` · this one ${(currentDwellMs / 1000).toFixed(1)} s`}
              </p>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Session", fmtTime(state.sessionMs)],
            ["Reels", String(reelsSeen(state))],
            [
              "Liked",
              String(state.engaged.filter(Boolean).length + (state.currentEngaged ? 1 : 0)),
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-r-paper py-2.5">
              <div className="font-grotesk text-[18px] font-bold tabular-nums">{v}</div>
              <Mono className="text-[9px]">{k}</Mono>
            </div>
          ))}
        </div>

        <div className="border-t border-r-line pt-4">
          <Mono>Session context</Mono>
          <p className="mt-1 text-[11.5px] text-r-mute">
            A phone reads these passively, and only while you are on the Reels feed. Here you set
            them to see how the score reacts.
          </p>
          <label className="mt-3 block text-[13px] font-bold">
            How this session started
            <select
              className="mt-1.5 w-full rounded-xl border border-r-line bg-r-paper px-3 py-2 text-[13px] font-normal"
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
          <div className="mt-3 text-[13px] font-bold">
            Short video earlier today
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {[0, 30, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDailyMinBefore(m)}
                  className={cn(
                    "rounded-xl py-1.5 font-rmono text-[11px] tabular-nums transition-colors",
                    Math.round(state.dailyMinBefore) === m
                      ? "bg-r-ink text-r-paper"
                      : "bg-r-paper hover:bg-r-section",
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-r-line pt-4 text-[13px]">
          {[
            {
              label: "Pretend it's 11 pm",
              hint: "Try the night signal (9 pm – 7 am)",
              checked: simulateNight,
              set: setSimulateNight,
            },
            {
              label: "Lying still in a dark room",
              hint: "What the motion and light sensors would report in bed",
              checked: state.stillInDark,
              set: setStillInDark,
            },
            {
              label: "Demo speed ×10",
              hint: "Session clock runs ten times faster",
              checked: demoSpeed,
              set: setDemoSpeed,
            },
          ].map((t) => (
            <label key={t.label} className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="font-bold">{t.label}</span>
                <span className="block text-[11.5px] text-r-mute">{t.hint}</span>
              </span>
              <Switch checked={t.checked} onCheckedChange={t.set} aria-label={t.label} />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-r-line pt-3 text-[11.5px] text-r-mute">
          <span>
            Session {state.sessionNumber} ·{" "}
            {shouldCheckIn(state.sessionNumber)
              ? "will ask if it was well spent"
              : `asks “well spent?” 1 in ${CHECK_IN_EVERY}`}
          </span>
          {live && (
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-full border border-r-line bg-r-paper px-3 py-1.5 font-grotesk text-[12px] font-bold text-r-ink hover:bg-r-section"
            >
              End session
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <Link to="/assumptions" className="font-bold text-r-ink underline underline-offset-2">
            What it assumes, and why →
          </Link>
          {state.events.length > 0 && (
            <button
              type="button"
              onClick={exportLog}
              className="text-r-mute underline underline-offset-2"
            >
              Download log ({state.events.length})
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
