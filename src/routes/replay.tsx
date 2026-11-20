import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DRIFT_THRESHOLD } from "@/lib/drift";
import {
  DETECTORS,
  fireMinute,
  REGRETTED,
  replay,
  scorecard,
  SESSIONS,
  type RealSession,
} from "@/lib/replay";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/replay")({
  head: () => ({
    meta: [
      { title: "Reelio · Replay of real sessions" },
      {
        name: "description",
        content:
          "56 real Instagram Reels sessions replayed through Reelio's detector and compared with a 15-minute timer.",
      },
    ],
  }),
  component: ReplayPage,
});

const TIMER = DETECTORS.find((d) => d.kind === "timer")!;
const V2 = DETECTORS.find((d) => d.key === "v2")!;

function fmtHour(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${suffix}`;
}

function regretTone(r: number | null) {
  if (r === null) return "bg-foreground/15";
  if (r >= REGRETTED) return "bg-deep";
  if (r === 3) return "bg-drift";
  return "bg-calm";
}

function regretWord(r: number | null) {
  if (r === null) return "not asked";
  if (r >= REGRETTED) return `regretted (${r}/5)`;
  return `fine (${r}/5)`;
}

function Scorecards() {
  const cards = DETECTORS.map((d) => scorecard(d));
  const v2 = cards.find((c) => c.detector.key === "v2")!;
  const timer = cards.find((c) => c.detector.kind === "timer")!;
  const share = Math.round((v2.minutesAfterAlert / timer.minutesAfterAlert) * 100);

  return (
    <section>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.detector.key}
            className={cn(
              "rounded-[1.5rem] p-5 shadow-soft",
              c.detector.key === "v2" ? "bg-card ring-2 ring-deep/50" : "glass",
            )}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-soft text-[20px]">{c.detector.label}</h3>
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {c.detector.key === "v2"
                  ? "median time per card"
                  : c.detector.key === "v1"
                    ? "as first built"
                    : "baseline"}
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Regretted sessions caught</dt>
                <dd className="font-soft text-[22px] tabular-nums">
                  {c.regrettedCaught}
                  <span className="text-[14px] text-muted-foreground"> / {c.regrettedTotal}</span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">False alarms on fine sessions</dt>
                <dd className="font-soft text-[22px] tabular-nums">
                  {c.falseAlarms}
                  <span className="text-[14px] text-muted-foreground"> / {c.fineTotal}</span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Regretted minutes after the pause</dt>
                <dd className="font-soft text-[22px] tabular-nums">
                  {Math.round(c.minutesAfterAlert)}
                  <span className="text-[14px] text-muted-foreground">
                    {" "}
                    / {Math.round(c.regrettedMinutes)}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
        Reelio v2 reaches {share}% of the timer&apos;s recoverable minutes with {v2.falseAlarms}{" "}
        false alarm
        {v2.falseAlarms === 1 ? "" : "s"} instead of {timer.falseAlarms}. A timer interrupts good
        sessions and bad ones alike, which is why people turn timers off. The difference between v1
        and v2 is one change: &ldquo;time on each card&rdquo; uses the median of the last 8 reels
        instead of the mean, because one long reel was hiding a run of fast swipes.
      </p>
    </section>
  );
}

function SessionChart({ session }: { session: RealSession }) {
  const v2 = useMemo(() => replay(session, "median"), [session]);
  const timerAt = fireMinute(session, TIMER);
  const deep = "var(--deep)";
  const ink = "var(--muted-foreground)";

  return (
    <div className="rounded-[1.75rem] bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-soft text-[22px]">Drift score through session {session.id}</h3>
        <p className="text-[13px] text-muted-foreground">
          {session.weekday} · started {fmtHour(session.startHour)} · {v2.totalMin.toFixed(1)} min ·{" "}
          {session.reels.length} reels · {regretWord(session.regret)}
          {session.reason ? ` · opened for: “${session.reason}”` : ""}
        </p>
      </div>
      <div
        className="mt-4 h-[280px]"
        role="img"
        aria-label={`Drift score over ${v2.totalMin.toFixed(0)} minutes`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={v2.points} margin={{ top: 22, right: 16, bottom: 4, left: -18 }}>
            <CartesianGrid
              vertical={false}
              stroke="color-mix(in oklab, var(--foreground) 8%, transparent)"
            />
            <XAxis
              dataKey="min"
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={(v: number) => `${Math.round(v)}m`}
              tick={{ fontSize: 11, fill: ink }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 35, 70, 100]}
              tick={{ fontSize: 11, fill: ink }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: ink, strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 14,
                border: "none",
                boxShadow: "0 10px 30px -12px rgba(0,0,0,.25)",
                fontSize: 12,
              }}
              labelFormatter={(v) => `${Number(v).toFixed(1)} min in`}
              formatter={(v, _n, item) => [
                `${v} (reel ${(item.payload as { reel: number }).reel})`,
                "Drift",
              ]}
            />
            <ReferenceLine
              y={DRIFT_THRESHOLD}
              stroke={ink}
              strokeDasharray="4 4"
              label={{ value: "threshold", position: "insideTopLeft", fontSize: 11, fill: ink }}
            />
            {timerAt !== null && (
              <ReferenceLine
                x={timerAt}
                stroke={ink}
                strokeDasharray="2 4"
                label={{
                  value: "15-min timer",
                  position: "insideBottomRight",
                  fontSize: 11,
                  fill: ink,
                }}
              />
            )}
            {v2.firedAtMin !== null && (
              <ReferenceLine
                x={v2.firedAtMin}
                stroke={deep}
                strokeWidth={2}
                label={{
                  value: "Reelio pauses",
                  position: "top",
                  fontSize: 11,
                  fill: "var(--foreground)",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: deep, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">
        {v2.firedAtMin !== null
          ? `Reelio would have paused at ${v2.firedAtMin.toFixed(1)} min (reel ${v2.firedAtReel}), giving back ${(v2.totalMin - v2.firedAtMin).toFixed(0)} min.`
          : "Reelio would not have interrupted this session."}{" "}
        {timerAt !== null
          ? "A timer would have fired at 15 min."
          : "A 15-minute timer would not have fired."}
      </p>
    </div>
  );
}

function ReplayPage() {
  const labelled = useMemo(
    () =>
      [...SESSIONS]
        .filter((s) => s.regret !== null)
        .sort((a, b) => b.regret! - a.regret! || b.minutes - a.minutes),
    [],
  );
  const [selected, setSelected] = useState<number>(labelled[0]?.id ?? 1);
  const session = SESSIONS.find((s) => s.id === selected) ?? SESSIONS[0]!;
  const totalReels = SESSIONS.reduce((a, s) => a + s.reels.length, 0);

  return (
    <main className="min-h-svh bg-page">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          to="/"
          className="text-[13px] text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to the live demo
        </Link>
        <header className="mt-6 max-w-3xl">
          <h1 className="font-soft text-[44px] font-light leading-none sm:text-[56px]">Replay</h1>
          <p className="mt-4 font-soft text-[19px] font-light italic leading-snug text-muted-foreground">
            {SESSIONS.length} real Reels sessions ({totalReels.toLocaleString()} reels) logged on my
            own phone by the Reelio Android app, run through the exact detector in the live demo.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            After {labelled.length} of these sessions I rated, from 1 to 5, how much I regretted the
            time. The question for any detector: does it interrupt the sessions I regretted, and
            leave the fine ones alone?
          </p>
        </header>

        <div className="mt-10">
          <Scorecards />
        </div>

        <section className="mt-12">
          <h2 className="font-soft text-[26px]">Pick a session</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Rated sessions, most regretted first. Bar length is session length; a dark tick means
            Reelio v2 would have paused it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {labelled.map((s) => {
              const firedAt = fireMinute(s, V2);
              const fired = firedAt !== null;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    "flex w-[132px] flex-col gap-1.5 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    s.id === selected
                      ? "bg-card shadow-soft ring-1 ring-foreground/15"
                      : "glass hover:bg-card/80",
                  )}
                  aria-pressed={s.id === selected}
                >
                  <span className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", regretTone(s.regret))} />
                      {s.regret}/5
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(s.minutes)} min
                    </span>
                  </span>
                  <span className="relative h-1.5 rounded-full bg-foreground/8">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-foreground/35"
                      style={{ width: `${Math.min(100, (s.minutes / 80) * 100)}%` }}
                    />
                    {fired && (
                      <span className="absolute -top-1 right-0 h-3.5 w-1 rounded-full bg-deep" />
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {s.weekday} {fmtHour(s.startHour)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <SessionChart session={session} />
          </div>
        </section>

        <section className="mt-12 max-w-3xl rounded-[1.5rem] glass p-6 text-[13px] leading-relaxed text-muted-foreground">
          <h2 className="font-soft text-[20px] text-foreground">
            What this does and doesn&apos;t show
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              One person, about ten days in March 2026, {labelled.length} rated sessions. It is a
              first signal, not proof.
            </li>
            <li>
              The v2 change was found by looking at this same data, so its score here is optimistic.
              It is one principled change (median instead of mean), not tuned numbers; it needs new
              sessions to confirm.
            </li>
            <li>
              &ldquo;Regretted&rdquo; means a self-rating of {REGRETTED} or 5 right after the
              session. &ldquo;Minutes after the pause&rdquo; assumes the pause would have ended the
              session, which real people won&apos;t always do.
            </li>
            <li>
              No content, account or contact data is stored: only time per reel, likes, start hour
              and the rating.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
