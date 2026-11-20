// "How it decides": the detector's live working, in the Reelio app's own pastel palette.
import { Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import type { ReelioSession } from "@/hooks/use-reelio-session";
import {
  CALM_TO_RESET,
  CHECK_IN_EVERY,
  COOLDOWN_MS,
  ENTRIES,
  LADDER,
  MIN_FEED_MS,
  STEP_GAP_MS,
  STREAK_TO_INTERRUPT,
  shouldCheckIn,
  thresholdFor,
} from "@/lib/drift";
import { personalWeight, PERSONAS, PRIORS } from "@/lib/baseline";
import { FACTORS, type Strength } from "@/lib/evidence";
import { reelsSeen } from "@/lib/session";
import { STATE_CUTS, stateFor } from "@/lib/states";
import { cn } from "@/lib/utils";

// Reelio app palette (theme object D in the Android WebView UI).
const P = {
  ink: "#2D3436",
  track: "#E4DED4",
  blue: "#A8C5D6",
  blueDark: "#6E93A9",
  blueSoft: "#EBF2F7",
  sage: "#9EB384",
  sageSoft: "#F0F4EC",
  sageDark: "#6B8252",
  peach: "#F7D1BA",
  peachSoft: "#FAF2EC",
  peachDark: "#C99A7F",
  blush: "#E5C3C6",
  blushSoft: "#FAF0F2",
  blushDark: "#B88A8E",
};

/** Each ladder step wears one of the app's calm semantic colours: sage → peach → blush. */
const STEP_TONE = {
  1: { fill: P.sage, soft: P.sageSoft, dark: P.sageDark },
  2: { fill: P.peach, soft: P.peachSoft, dark: P.peachDark },
  3: { fill: P.blush, soft: P.blushSoft, dark: P.blushDark },
} as const;

const STRENGTH: Record<Strength, string> = {
  strong: "strong evidence",
  moderate: "moderate evidence",
  weak: "weak evidence",
};

function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-rmono text-[10px] font-bold uppercase tracking-[0.14em] text-r-ink3",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[20px] border-[1.5px] border-[rgba(26,22,18,0.06)] bg-r-card p-4 shadow-paper",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Score ring with the four state bands and the person's threshold marked. */
function ScoreRing({ score, threshold }: { score: number; threshold: number }) {
  const st = stateFor(score);
  const r = 42;
  const c = 2 * Math.PI * r;
  const tick = (v: number, w = 0.9, color = P.ink) => (
    <circle
      cx="50"
      cy="50"
      r={r}
      fill="none"
      stroke={color}
      strokeWidth="10"
      strokeDasharray={`${w} ${c}`}
      strokeDashoffset={-c * (v / 100)}
      opacity={0.5}
    />
  );
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={P.track} strokeWidth="8" />
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
        {tick(STATE_CUTS.aware, 0.6, "#7F8C8D")}
        {tick(STATE_CUTS.hooked, 0.6, "#7F8C8D")}
        {tick(STATE_CUTS.doom, 0.6, "#7F8C8D")}
        {tick(threshold, 1.6)}
      </svg>
      <div className="text-center">
        <div className="font-grotesk text-[34px] font-bold leading-none tabular-nums text-r-charcoal">
          {score}
        </div>
        <Mono className="mt-1 block text-[9px]">score</Mono>
      </div>
    </div>
  );
}

function LadderCard({ session }: { session: ReelioSession }) {
  const { state } = session;
  const threshold = thresholdFor(state.baseline);
  const level = state.level;
  const ms = state.sessionMs;

  let next: string;
  if (state.overlay) next = "Pause screen is showing.";
  else if (level === 0) {
    const left = MIN_FEED_MS - ms;
    next =
      left > 0
        ? `Nothing can happen for another ${fmtTime(left)} of Reels time.`
        : `Step 1 starts once the score stays at ${threshold}+ for ${STREAK_TO_INTERRUPT} reels.`;
  } else if (level < 3) {
    const left = (state.levelAtMs ?? ms) + STEP_GAP_MS - ms;
    next =
      left > 0
        ? `Step ${level + 1} possible in ${fmtTime(left)}, if the score stays high.`
        : `Step ${level + 1} starts after ${STREAK_TO_INTERRUPT} more high reels.`;
  } else {
    const left = (state.lastPauseAtMs ?? ms) + COOLDOWN_MS - ms;
    next =
      left > 0
        ? `Pause screen can come back in ${fmtTime(left)}, with a 5-second wait.`
        : `Pause screen comes back after ${STREAK_TO_INTERRUPT} more high reels.`;
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="font-grotesk text-[15px] font-bold text-r-charcoal">Intervention ladder</span>
        <Mono>step {level} of 3</Mono>
      </div>
      <ol className="mt-3 space-y-2">
        {LADDER.map((step) => {
          const tone = STEP_TONE[step.level];
          const on = level >= step.level;
          const was = !on && state.peakLevel >= step.level;
          return (
            <li
              key={step.level}
              className="flex gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-500"
              style={{ background: on ? tone.soft : "transparent" }}
            >
              <span
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full font-grotesk text-[12px] font-bold transition-colors duration-500"
                style={{
                  background: on ? tone.fill : P.track,
                  color: on ? P.ink : "#7F8C8D",
                }}
              >
                {step.level}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-grotesk text-[13.5px] font-bold text-r-charcoal">
                    {step.name}
                  </span>
                  {on && (
                    <span
                      className="rounded-full px-1.5 py-px font-rmono text-[8.5px] font-bold uppercase tracking-[0.1em]"
                      style={{ background: tone.fill, color: P.ink }}
                    >
                      on
                    </span>
                  )}
                  {was && <Mono className="text-[8.5px]">lifted</Mono>}
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-r-ink2">{step.what}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 border-t border-r-track pt-3">
        <div className="flex items-center justify-between text-[12px] text-r-ink2">
          <span>
            Score at {threshold}+ in a row
          </span>
          <span className="font-rmono font-bold tabular-nums text-r-charcoal">
            {state.streak}/{STREAK_TO_INTERRUPT}
          </span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {Array.from({ length: STREAK_TO_INTERRUPT }, (_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-500"
              style={{ background: i < state.streak ? P.blueDark : P.track }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-r-ink2">{next}</p>
        {level > 0 && (
          <p className="mt-1 text-[11.5px] leading-snug text-r-ink3">
            Slow down for {CALM_TO_RESET} reels and it all lifts ({Math.min(state.calm, CALM_TO_RESET)}/
            {CALM_TO_RESET}).
          </p>
        )}
        {state.baseline.thresholdOffset !== 0 && (
          <p className="mt-1 text-[11px] text-r-ink3">
            Threshold {state.baseline.thresholdOffset > 0 ? "+" : ""}
            {state.baseline.thresholdOffset} from your check-ins.
          </p>
        )}
      </div>
    </Card>
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
    baseline,
    loadSample,
    loadTypicalWeek,
    clearHistory,
  } = session;
  const st = stateFor(drift.score);
  const live = state.phase === "feed";
  const threshold = thresholdFor(state.baseline);
  const ladderPreset =
    state.entry === "dm" && simulateNight && demoSpeed && Math.round(state.dailyMinBefore) === 60;

  const tryLadder = () => {
    setEntry("dm");
    setSimulateNight(true);
    setDailyMinBefore(60);
    setDemoSpeed(true);
  };

  return (
    <section className="bg-reelio-app w-full rounded-[26px] font-nunito text-r-charcoal shadow-paper-lift">
      <header className="flex items-center gap-3 border-b border-r-track px-5 py-3.5">
        <span
          className={cn("size-2.5 rounded-full", live && "animate-pulse")}
          style={{ background: st.accent }}
        />
        <span className="flex-1 font-grotesk text-[17px] font-bold">How it decides</span>
        <Mono>engine v1</Mono>
      </header>

      <div className="space-y-3 px-4 pb-5 pt-4">
        <Card className="flex items-center gap-4" >
          <ScoreRing score={drift.score} threshold={threshold} />
          <div>
            <span
              className="inline-block rounded-full px-2.5 py-0.5 font-grotesk text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: st.accent, background: st.bg }}
            >
              {st.label}
            </span>
            <p className="mt-2 font-grotesk text-[18px] font-bold leading-tight">{st.headline}</p>
            <p className="mt-1 text-[12px] leading-snug text-r-ink2">
              {live && idle
                ? "No swipes for a minute. Session clock paused."
                : state.level > 0
                  ? `Step ${state.level} of the ladder is on.`
                  : st.blurb}
            </p>
          </div>
        </Card>

        <div
          className="rounded-[20px] border-[1.5px] p-3.5"
          style={{ background: P.blueSoft, borderColor: "rgba(110,147,169,0.18)" }}
        >
          <div className="font-grotesk text-[13.5px] font-bold">Want to see the ladder?</div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-r-ink2">
            Sets: came to reply to a message, 11 pm, an hour of Reels earlier, clock ×10. Then
            swipe through reels quickly without liking any. Step 1 comes at about 1 real minute.
          </p>
          <button
            type="button"
            onClick={tryLadder}
            disabled={ladderPreset}
            className="mt-2 rounded-full px-3.5 py-1.5 font-grotesk text-[12px] font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: P.blueDark }}
          >
            {ladderPreset ? "Set. Now swipe fast" : "Set it up"}
          </button>
        </div>

        <LadderCard session={session} />

        <Card>
          <div className="flex items-baseline justify-between">
            <span className="font-grotesk text-[15px] font-bold">Signals</span>
            <Mono>points</Mono>
          </div>
          <ul className="mt-3 space-y-3">
            {drift.parts.map((p) => (
              <li key={p.key}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-grotesk font-bold">{p.label}</span>
                  <span className="font-rmono text-[11px] tabular-nums text-r-ink3">
                    {Math.round(p.points)}/{p.max}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: P.blueSoft }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(p.points / p.max) * 100}%`, background: P.blue }}
                  />
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-r-ink2">
                  <Mono className="text-[9px]">
                    {STRENGTH[FACTORS.find((f) => f.key === p.key)!.strength]}
                  </Mono>{" "}
                  · {p.detail}
                  {p.key === "skips" && live && ` · this one ${(currentDwellMs / 1000).toFixed(1)} s`}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between font-rmono text-[9px] uppercase tracking-[0.1em]">
            <span style={{ color: "#3A9E6F" }}>mindful</span>
            <span style={{ color: "#6B3FA0" }}>aware {STATE_CUTS.aware}</span>
            <span style={{ color: "#C4973A" }}>hooked {STATE_CUTS.hooked}</span>
            <span style={{ color: "#C4563A" }}>doom {STATE_CUTS.doom}</span>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Session", fmtTime(state.sessionMs), P.blueSoft],
            ["Reels", String(reelsSeen(state)), P.peachSoft],
            [
              "Liked",
              String(state.engaged.filter(Boolean).length + (state.currentEngaged ? 1 : 0)),
              P.blushSoft,
            ],
          ].map(([k, v, bg]) => (
            <div
              key={k}
              className="rounded-2xl border-[1.5px] border-[rgba(26,22,18,0.05)] py-2.5"
              style={{ background: bg }}
            >
              <div className="font-grotesk text-[18px] font-bold tabular-nums">{v}</div>
              <Mono className="text-[9px]">{k}</Mono>
            </div>
          ))}
        </div>

        <Card>
          <span className="font-grotesk text-[15px] font-bold">Your baseline</span>
          <p className="mt-1 text-[11.5px] leading-snug text-r-ink2">
            {baseline.n
              ? `From ${baseline.n} sessions over ${baseline.days} days. Starts at the research numbers and moves towards your own as sessions add up.`
              : "No history yet, so these are the research numbers. Each finished session moves them towards your own."}
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            {[
              ["Session", `${baseline.sessionMin.toFixed(1)}m`, personalWeight(baseline.n, PRIORS.sessionMin.k)],
              ["Skips", `${Math.round(baseline.skipRate * 100)}%`, personalWeight(baseline.n, PRIORS.skipRate.k)],
              ["Day", `${Math.round(baseline.dailyMin)}m`, personalWeight(baseline.days, PRIORS.dailyMin.k)],
            ].map(([k, v, w]) => (
              <div key={k as string} className="rounded-2xl px-1 py-2.5" style={{ background: P.sageSoft }}>
                <div className="font-grotesk text-[17px] font-bold tabular-nums">{v as string}</div>
                <Mono className="text-[9px]">{k as string}</Mono>
                <div className="mx-auto mt-1.5 h-1 w-3/4 overflow-hidden rounded-full" style={{ background: P.track }}>
                  <div
                    className="h-full"
                    style={{ width: `${Math.round((w as number) * 100)}%`, background: P.sage }}
                  />
                </div>
                <div className="mt-1 text-[9.5px] text-r-ink3">{Math.round((w as number) * 100)}% you</div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {(Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => loadSample(p)}
                title={PERSONAS[p].description}
                className="rounded-xl border-[1.5px] border-[rgba(26,22,18,0.06)] bg-r-paper px-2.5 py-2 text-left hover:bg-r-blue-soft"
              >
                <div className="font-grotesk text-[12px] font-bold">Load: {PERSONAS[p].label}</div>
                <div className="text-[10px] leading-tight text-r-ink3">{PERSONAS[p].description}</div>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] text-r-ink3">
            The app starts with 8 days of made-up sessions so there is something to explore. The
            sample users are 14 made-up days each. None of it is a real person.{" "}
            <button type="button" onClick={loadTypicalWeek} className="underline underline-offset-2">
              Back to the sample week
            </button>
            {baseline.n > 0 && (
              <>
                {" · "}
                <button type="button" onClick={clearHistory} className="underline underline-offset-2">
                  Clear history
                </button>
              </>
            )}
          </p>
        </Card>

        <Card>
          <span className="font-grotesk text-[15px] font-bold">Session context</span>
          <p className="mt-1 text-[11.5px] leading-snug text-r-ink2">
            On a phone these are read passively, only while the Reels feed is open. Here you set them
            to see how the score moves.
          </p>
          <label className="mt-3 block text-[13px] font-bold">
            How this session started
            <select
              className="mt-1.5 w-full rounded-xl border-[1.5px] border-[rgba(26,22,18,0.08)] bg-r-paper px-3 py-2 text-[13px] font-normal"
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
                      ? "text-white"
                      : "bg-r-paper hover:bg-r-blue-soft",
                  )}
                  style={Math.round(state.dailyMinBefore) === m ? { background: P.blueDark } : undefined}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3 text-[13px]">
            {[
              { label: "Pretend it's 11 pm", hint: "Turns on the night signal (9 pm to 7 am)", checked: simulateNight, set: setSimulateNight },
              { label: "Lying still in a dark room", hint: "What the motion and light sensors would report in bed", checked: state.stillInDark, set: setStillInDark },
              { label: "Demo speed ×10", hint: "The session clock runs ten times faster", checked: demoSpeed, set: setDemoSpeed },
            ].map((t) => (
              <label key={t.label} className="flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="font-bold">{t.label}</span>
                  <span className="block text-[11.5px] text-r-ink3">{t.hint}</span>
                </span>
                <Switch
                  checked={t.checked}
                  onCheckedChange={t.set}
                  aria-label={t.label}
                  className="data-[state=checked]:bg-r-blue-dark"
                />
              </label>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3 px-1 text-[11.5px] text-r-ink3">
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
              className="shrink-0 rounded-full border-[1.5px] border-[rgba(26,22,18,0.08)] bg-r-card px-3 py-1.5 font-grotesk text-[12px] font-bold text-r-charcoal hover:bg-r-blue-soft"
            >
              End session
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12px]">
          <Link to="/assumptions" className="font-bold text-r-blue-dark underline underline-offset-2">
            What it assumes, and why →
          </Link>
          {state.events.length > 0 && (
            <button type="button" onClick={exportLog} className="text-r-ink3 underline underline-offset-2">
              Download log ({state.events.length})
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
