// The Reelio app, as it would look on the phone while (and after) someone scrolls Reels.
// Visual language ported from the Reelio Android app's WebView UI (paper ground, origami cards,
// Space Grotesk + Space Mono, four capture states).
import { Activity, BarChart3, Eye, History } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { ReelioSession } from "@/hooks/use-reelio-session";
import {
  minutesToday,
  personalWeight,
  PERSONAS,
  PRIORS,
  type SessionSummary,
} from "@/lib/baseline";
import { thresholdFor } from "@/lib/drift";
import { reelsSeen } from "@/lib/session";
import { STATES, stateFor, type StateKey } from "@/lib/states";
import { cn } from "@/lib/utils";
import { MoodFace } from "./mood-face";

type Tab = "monitor" | "sessions" | "baseline";

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const fmtMin = (m: number) => (m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(m < 10 ? 1 : 0)}m`);
const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const isToday = (t: number) => new Date(t).toDateString() === new Date().toDateString();

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "font-rmono text-[10px] font-bold uppercase tracking-[0.14em] text-r-mute",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Card({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("notch rounded-[20px] bg-r-paper p-4", className)} style={style}>
      {children}
    </div>
  );
}

function StateBadge({ k, small }: { k: StateKey; small?: boolean }) {
  const st = STATES[k];
  return (
    <span
      className={cn(
        "inline-block rounded-full border font-grotesk font-bold uppercase tracking-[0.12em]",
        small ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[10px]",
      )}
      style={{ color: st.accent, background: st.bg, borderColor: `${st.accent}40` }}
    >
      {k === "doom" ? "DOOM" : st.label}
    </span>
  );
}

function Monitor({ session }: { session: ReelioSession }) {
  const { state, drift, history, idle } = session;
  const live = state.phase === "feed" && reelsSeen(state) > 0;
  const last = history.at(-1);
  const score = live ? drift.score : (last?.peakScore ?? 0);
  const st = stateFor(score);

  const todays = history.filter((s) => isToday(s.startedAt));
  const sessionsToday = todays.length + (live ? 1 : 0);
  const minToday = minutesToday(history) + (live ? state.sessionMs / 60000 : 0);
  const calmToday = todays.filter((s) => s.state === "mindful" || s.state === "aware").length;
  const recent = history.slice(-7);
  const lastTen = history.slice(-10);
  const autopilot = lastTen.filter((s) => s.state === "hooked" || s.state === "doom").length;

  return (
    <div className="space-y-3">
      <Card className="p-5" style={{ background: st.bg }}>
        <StateBadge k={st.key} />
        <div className="mt-4 flex items-center gap-4">
          <div className="shrink-0">
            <MoodFace score={score} size={84} />
          </div>
          <div className="min-w-0">
            <h3 className="font-grotesk text-[26px] font-bold leading-[1.02] text-r-ink">
              {st.headline}
            </h3>
            <p className="mt-2 font-nunito text-[13px] leading-snug text-r-mute">
              {live
                ? idle
                  ? "No swipes for a minute. Session clock paused."
                  : `${reelsSeen(state)} ${reelsSeen(state) === 1 ? "reel" : "reels"} · ${fmtClock(state.sessionMs)} in Reels. ${st.blurb}`
                : sessionsToday
                  ? `${calmToday} of ${sessionsToday} sessions closed mindfully today.`
                  : "No sessions yet today. Open Reels, Reelio starts tracking automatically."}
            </p>
          </div>
        </div>
        {live && state.pauseCount > 0 && (
          <span className="mt-3 inline-block rounded-full bg-r-ink px-3 py-1 font-nunito text-[11px] font-bold text-r-paper">
            Paused {state.pauseCount === 1 ? "once" : `${state.pauseCount}×`} this session
          </span>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <div className="row-span-2 rounded-[20px] bg-r-mindful-bg p-4">
          <div className="grid size-9 place-items-center rounded-xl bg-r-mindful text-white">
            <Activity className="size-4" />
          </div>
          <div className="mt-4 font-grotesk text-[30px] font-bold leading-none text-r-mindful">
            {fmtMin(minToday)}
          </div>
          <Label className="mt-2 text-r-mindful">On Reels today</Label>
          <p className="mt-2 font-nunito text-[11px] text-r-mute">
            usual day {Math.round(session.baseline.dailyMin)}m
          </p>
        </div>
        <div className="rounded-[20px] bg-r-doom-bg p-4">
          <div className="font-grotesk text-[28px] font-bold leading-none text-r-doom">
            {sessionsToday}
          </div>
          <Label className="mt-1.5 text-r-doom">Sessions</Label>
        </div>
        <div className="rounded-[20px] bg-r-aware-bg p-4">
          <div className="font-grotesk text-[24px] font-bold leading-none text-r-aware">
            {todays.length ? calmToday : "–"}
            <span className="text-[14px] opacity-60">/{todays.length || "–"}</span>
          </div>
          <Label className="mt-1.5 text-r-aware">Closed mindfully</Label>
        </div>
      </div>

      <Card className="border-l-4" style={{ borderLeftColor: st.accent }}>
        <Label>Autopilot rate</Label>
        <p className="mt-2 font-grotesk text-[17px] font-bold leading-snug text-r-ink">
          {lastTen.length < 3
            ? "Not enough sessions yet."
            : `About ${Math.round((autopilot / lastTen.length) * 10)} in 10 sessions are on autopilot.`}
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          {Array.from({ length: 7 }, (_, i) => recent[i]).map((s, i) => (
            <span
              key={i}
              className="size-4 rounded-full border"
              style={
                s
                  ? { background: STATES[s.state].accent, borderColor: STATES[s.state].accent }
                  : { borderColor: "#C9BFAE" }
              }
              title={s ? `${hhmm(s.startedAt)} · ${STATES[s.state].label}` : undefined}
            />
          ))}
          <span className="ml-1 font-nunito text-[11px] text-r-mute">last 7</span>
        </div>
      </Card>
    </div>
  );
}

function SessionRow({ s }: { s: SessionSummary }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-r-paper px-3 py-2.5">
      <span className="w-11 font-rmono text-[11px] text-r-mute">{hhmm(s.startedAt)}</span>
      <div className="min-w-0 flex-1">
        <div className="font-grotesk text-[14px] font-bold text-r-ink">
          {fmtMin(s.minutes)} · {s.reels} reels
        </div>
        <div className="font-nunito text-[11px] text-r-mute">
          {Math.round(s.skipRate * 100)}% skipped
          {s.pauses > 0 && " · paused by Reelio"}
          {s.checkIn && ` · ${s.checkIn === "yes" ? "well spent" : "not well spent"}`}
        </div>
      </div>
      <StateBadge k={s.state} small />
    </li>
  );
}

function Sessions({ session }: { session: ReelioSession }) {
  const { state, drift, history } = session;
  const live = state.phase === "feed" && reelsSeen(state) > 0;
  const todays = history.filter((s) => isToday(s.startedAt)).reverse();
  const earlier = history.filter((s) => !isToday(s.startedAt));

  // 14-day strip: each day coloured by its average peak score, like the Capture Calendar.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000).toDateString();
    const ss = history.filter((s) => new Date(s.startedAt).toDateString() === d);
    const avg = ss.length ? ss.reduce((a, s) => a + s.peakScore, 0) / ss.length : null;
    return { d, avg, n: ss.length };
  });

  return (
    <div className="space-y-3">
      <Card>
        <Label>Last 14 days</Label>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {days.map(({ d, avg, n }) => (
            <div
              key={d}
              title={`${d}: ${n} sessions`}
              className="aspect-square rounded-lg border"
              style={
                avg === null
                  ? { borderColor: "#E2DACB" }
                  : { background: stateFor(avg).bg, borderColor: `${stateFor(avg).accent}66` }
              }
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 font-nunito text-[10px] text-r-mute">
          {(["doom", "hooked", "aware", "mindful"] as StateKey[]).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span
                className="size-2.5 rounded-sm border"
                style={{ background: STATES[k].bg, borderColor: STATES[k].accent }}
              />
              {k[0]!.toUpperCase() + k.slice(1)}
            </span>
          ))}
        </div>
      </Card>

      <div>
        <Label className="px-1">Today</Label>
        <ul className="mt-2 space-y-2">
          {live && (
            <li className="flex items-center gap-3 rounded-2xl border border-dashed border-r-blue-dark/40 bg-r-paper/60 px-3 py-2.5">
              <span className="w-11 font-rmono text-[11px] text-r-blue-dark">now</span>
              <div className="flex-1 font-grotesk text-[14px] font-bold text-r-ink">
                {fmtClock(state.sessionMs)} · {reelsSeen(state)} reels
              </div>
              <StateBadge k={stateFor(drift.score).key} small />
            </li>
          )}
          {todays.map((s) => (
            <SessionRow key={s.id} s={s} />
          ))}
          {!live && !todays.length && (
            <li className="rounded-2xl bg-r-paper px-3 py-4 text-center font-nunito text-[12px] text-r-mute">
              No sessions recorded yet today
            </li>
          )}
        </ul>
      </div>
      {earlier.length > 0 && (
        <p className="px-1 font-nunito text-[11px] text-r-mute">
          + {earlier.length} earlier sessions over{" "}
          {new Set(earlier.map((s) => new Date(s.startedAt).toDateString())).size} days, used for
          your baseline.
        </p>
      )}
    </div>
  );
}

function BaselineRow({
  label,
  value,
  prior,
  weight,
  note,
}: {
  label: string;
  value: string;
  prior: string;
  weight: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl bg-r-paper p-3.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-grotesk text-[20px] font-bold text-r-ink">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-r-section">
        <div
          className="h-full rounded-full bg-r-blue-dark"
          style={{ width: `${Math.round(weight * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 font-nunito text-[11px] leading-snug text-r-mute">
        {Math.round(weight * 100)}% from you · {Math.round((1 - weight) * 100)}% from the default (
        {prior}). {note}
      </p>
    </div>
  );
}

function Baseline({ session }: { session: ReelioSession }) {
  const { baseline: b, loadSample, clearHistory } = session;
  const threshold = thresholdFor(b);
  return (
    <div className="space-y-3">
      <Card className="bg-r-section">
        <p className="font-grotesk text-[17px] font-bold leading-snug text-r-ink">
          {b.n
            ? `Learned from ${b.n} sessions over ${b.days} days.`
            : "Starting from research defaults."}
        </p>
        <p className="mt-1.5 font-nunito text-[12px] leading-snug text-r-mute">
          Doomscrolling looks different for everyone. Reelio starts from what studies find typical,
          then shifts towards your own pattern as it sees more of your sessions.
        </p>
      </Card>
      <BaselineRow
        label="Usual session"
        value={fmtMin(b.sessionMin)}
        prior={`${PRIORS.sessionMin.mean} min`}
        weight={personalWeight(b.n, PRIORS.sessionMin.k)}
        note="Time in the feed starts counting at twice this."
      />
      <BaselineRow
        label="Usual skip rate"
        value={`${Math.round(b.skipRate * 100)}%`}
        prior={`${PRIORS.skipRate.mean * 100}%`}
        weight={personalWeight(b.n, PRIORS.skipRate.k)}
        note="Only skipping above this counts."
      />
      <BaselineRow
        label="Usual day"
        value={`${Math.round(b.dailyMin)}m`}
        prior={`${PRIORS.dailyMin.mean} min`}
        weight={personalWeight(b.days, PRIORS.dailyMin.k)}
        note="'Earlier today' is judged against this."
      />
      <div className="rounded-2xl bg-r-paper p-3.5">
        <div className="flex items-baseline justify-between">
          <Label>Pause threshold</Label>
          <span className="font-grotesk text-[20px] font-bold text-r-ink">{threshold}</span>
        </div>
        <p className="mt-1.5 font-nunito text-[11px] leading-snug text-r-mute">
          {b.thresholdOffset === 0
            ? "Default. Your 'well spent?' answers move it: a regretted session that wasn't paused lowers it by 2, a pause on time you were happy with raises it by 3."
            : `${b.thresholdOffset > 0 ? "+" : ""}${b.thresholdOffset} from your check-ins.`}
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-r-line p-3.5">
        <Label>Try it with a sample user</Label>
        <p className="mt-1 font-nunito text-[11px] text-r-mute">
          Loads 14 days of generated history, not a real person&apos;s.
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {(Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => loadSample(p)}
              className="rounded-xl bg-r-paper px-2.5 py-2 text-left transition-colors hover:bg-r-blue/30"
            >
              <div className="font-grotesk text-[13px] font-bold text-r-ink">
                {PERSONAS[p].label}
              </div>
              <div className="font-nunito text-[10px] leading-tight text-r-mute">
                {PERSONAS[p].description}
              </div>
            </button>
          ))}
        </div>
        {b.n > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="mt-2 font-nunito text-[11px] text-r-mute underline underline-offset-2"
          >
            Clear history
          </button>
        )}
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: typeof Eye }[] = [
  { id: "monitor", label: "Monitor", icon: Eye },
  { id: "sessions", label: "Sessions", icon: History },
  { id: "baseline", label: "Baseline", icon: BarChart3 },
];

export function ReelioApp({ session }: { session: ReelioSession }) {
  const [tab, setTab] = useState<Tab>("monitor");
  const { state, drift, idle } = session;
  const live = state.phase === "feed" && reelsSeen(state) > 0;
  const st = stateFor(live ? drift.score : (session.history.at(-1)?.peakScore ?? 0));

  return (
    <div className="flex h-full flex-col bg-r-bg font-nunito text-r-ink">
      <header className="flex items-center justify-between border-b border-r-line px-5 pb-3 pt-12">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-8 place-items-center rounded-full"
            style={{ background: st.accent }}
          >
            <span className="size-3 rounded-full border-[3px] border-white/80" />
          </span>
          <span className="font-grotesk text-[22px] font-bold">Reelio</span>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full border bg-r-paper px-2.5 py-1 font-grotesk text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{
            color: live && !idle ? st.accent : "#8A8F8C",
            borderColor: live && !idle ? `${st.accent}88` : "#E2DACB",
          }}
        >
          <span
            className={cn("size-1.5 rounded-full", live && !idle && "animate-pulse")}
            style={{ background: "currentColor" }}
          />
          {live ? (idle ? "Paused" : `Tracking · ${fmtClock(state.sessionMs)}`) : "Ready"}
        </span>
      </header>

      <div className="bg-reelio min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
        {tab === "monitor" && <Monitor session={session} />}
        {tab === "sessions" && <Sessions session={session} />}
        {tab === "baseline" && <Baseline session={session} />}
      </div>

      <nav className="grid grid-cols-3 gap-1 border-t border-r-line bg-r-nav px-3 pb-6 pt-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-t-lg py-2 font-grotesk text-[11px] font-bold transition-colors",
              tab === id ? "bg-r-blue text-r-ink" : "text-r-ink2/70 hover:text-r-ink",
            )}
            aria-pressed={tab === id}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
