import { createFileRoute, Link } from "@tanstack/react-router";
import { COOLDOWN_MS, DRIFT_THRESHOLD, MIN_FEED_MS, STREAK_TO_INTERRUPT } from "@/lib/drift";
import {
  ACTIVATION,
  AHMED_2026,
  FACTORS,
  INTERRUPT_RULES,
  LEFT_OUT,
  SIGNAL_AUDIT,
  type AuditVerdict,
  WEIGHT_TOTAL,
  type Source,
  type Strength,
} from "@/lib/evidence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assumptions")({
  head: () => ({
    meta: [
      { title: "Reelio · What it assumes, and why" },
      {
        name: "description",
        content:
          "The behavioural signals behind Reelio's drift score, the research behind each, and what is still a guess.",
      },
    ],
  }),
  component: AssumptionsPage,
});

const VERDICT_STYLE: Record<AuditVerdict, string> = {
  used: "bg-calm/40 text-foreground",
  later: "bg-drift/40 text-foreground",
  "not used": "bg-foreground/10 text-muted-foreground",
};

const STRENGTH_STYLE: Record<Strength, string> = {
  strong: "bg-calm/40 text-foreground",
  moderate: "bg-drift/40 text-foreground",
  weak: "bg-foreground/10 text-muted-foreground",
};

function Sources({ sources }: { sources: Source[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {sources.map((s) => (
        <li key={s.url + s.label}>
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-muted-foreground underline decoration-foreground/20 underline-offset-2 hover:text-foreground"
          >
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function AssumptionsPage() {
  return (
    <main className="min-h-svh bg-page">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          to="/"
          className="text-[13px] text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to the live demo
        </Link>

        <header className="mt-6 max-w-3xl">
          <h1 className="font-soft text-[44px] font-light leading-none sm:text-[56px]">
            What Reelio assumes
          </h1>
          <p className="mt-5 font-soft text-[19px] font-light italic leading-snug text-muted-foreground">
            Reelio treats doomscrolling as scrolling that has drifted away from what you meant to do
            and turned passive: the kind of session people say afterwards they regret.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            It never asks anything before or during a session. It watches six behavioural signals,
            each chosen because published research links it to regretted or meaningless use. The
            weights follow how strong that evidence is. Where a study gave no number, the threshold
            is a design assumption and says so. None of this has been validated as a live trigger
            yet. That is the next step (see the end of this page).
          </p>
        </header>

        <section className="mt-10 rounded-[1.5rem] bg-card p-6 shadow-soft">
          <h2 className="font-soft text-[26px]">Active only while scrolling Reels</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
            {ACTIVATION.summary}
          </p>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {ACTIVATION.steps.map((st, i) => (
              <li key={st.title} className="rounded-2xl bg-foreground/[0.035] p-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-soft text-[18px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <h3 className="font-soft text-[18px]">{st.title}</h3>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{st.body}</p>
              </li>
            ))}
          </ol>
          <dl className="mt-5 grid gap-4 text-[13px] leading-relaxed md:grid-cols-3">
            <div>
              <dt className="font-medium">What it reads</dt>
              <dd className="text-muted-foreground">{ACTIVATION.privacy}</dd>
            </div>
            <div>
              <dt className="font-medium">Limits</dt>
              <dd className="text-muted-foreground">{ACTIVATION.limits}</dd>
            </div>
            <div>
              <dt className="font-medium">In this demo</dt>
              <dd className="text-muted-foreground">{ACTIVATION.demoNote}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            ["Score", `${FACTORS.length} factors, weights sum to ${WEIGHT_TOTAL}`],
            ["Pause when", `score ≥ ${DRIFT_THRESHOLD} for ${STREAK_TO_INTERRUPT} reels in a row`],
            [
              "Never",
              `before ${MIN_FEED_MS / 60000} min in the feed, or within ${COOLDOWN_MS / 60000} min of the last pause`,
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[1.25rem] glass p-4 shadow-soft">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {k}
              </div>
              <div className="mt-1 font-soft text-[18px] leading-snug">{v}</div>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="font-soft text-[28px]">The {FACTORS.length} signals</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
            The strongest single finding: in a 2026 field study of 1,445 sessions, the gap between
            intended and actual use predicted regret about twice as strongly as session length. That
            is why drifting from a purpose weighs the most and time weighs little.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {FACTORS.map((f) => (
              <article key={f.key} className="rounded-[1.5rem] bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-soft text-[22px] leading-tight">{f.label}</h3>
                  <span className="shrink-0 font-soft text-[22px] tabular-nums">
                    {f.weight}
                    <span className="text-[13px] text-muted-foreground"> pts</span>
                  </span>
                </div>
                <span
                  className={cn(
                    "mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    STRENGTH_STYLE[f.strength],
                  )}
                >
                  {f.strength} evidence
                </span>
                <dl className="mt-4 space-y-3 text-[13px] leading-relaxed">
                  <div>
                    <dt className="font-medium">Measures</dt>
                    <dd className="text-muted-foreground">{f.measures}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Why it&apos;s in</dt>
                    <dd className="text-muted-foreground">{f.finding}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Numbers used</dt>
                    <dd className="text-muted-foreground">{f.threshold}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">On a real phone</dt>
                    <dd className="text-muted-foreground">{f.onDevice}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Reelio already logs</dt>
                    <dd className="font-mono text-[11.5px] text-muted-foreground">
                      {f.reelioColumns.join(", ")}
                    </dd>
                  </div>
                </dl>
                <Sources sources={f.sources} />
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-soft text-[28px]">When and how it interrupts</h2>
          <div className="mt-5 space-y-3">
            {INTERRUPT_RULES.map((r) => (
              <div key={r.rule} className="rounded-[1.25rem] glass p-5">
                <h3 className="font-soft text-[19px]">{r.rule}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{r.why}</p>
                <Sources sources={r.sources} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-soft text-[28px]">All 100 logged signals, audited</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
            The Reelio Android app logs about 100 signals for every reel. Each group was checked
            against the research above. Only signals with published evidence drive the score; the
            rest wait for data or are dropped.
          </p>
          <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-card shadow-soft">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr className="border-b border-foreground/8">
                  <th className="px-5 py-3 font-medium">Group</th>
                  <th className="px-3 py-3 font-medium">Verdict</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Columns</th>
                  <th className="px-5 py-3 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {SIGNAL_AUDIT.map((a) => (
                  <tr
                    key={a.group}
                    className="border-b border-foreground/5 align-top last:border-0"
                  >
                    <td className="px-5 py-3 font-medium">{a.group}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]",
                          VERDICT_STYLE[a.verdict],
                        )}
                      >
                        {a.verdict}
                      </span>
                    </td>
                    <td className="hidden max-w-[260px] px-3 py-3 font-mono text-[11px] text-muted-foreground md:table-cell">
                      {a.columns}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-soft text-[28px]">Deliberately left out</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {LEFT_OUT.map((l) => (
              <div key={l.label} className="rounded-[1.25rem] glass p-5">
                <h3 className="font-soft text-[18px] leading-snug">{l.label}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{l.why}</p>
                <Sources sources={l.sources} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 max-w-3xl rounded-[1.5rem] bg-card p-6 shadow-soft">
          <h2 className="font-soft text-[24px]">What is still a guess, and how it gets tested</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-muted-foreground">
            <li>
              The weights rank factors by strength of evidence; they are not fitted to data. The
              thresholds marked as assumptions above are starting points.
            </li>
            <li>
              Studies measured these signals after the fact. Whether they work as a live trigger,
              minute by minute, is untested.
            </li>
            <li>
              The research suggests watching quietly for 1–2 weeks before triggering, then checking
              predictions against short post-session check-ins. Reelio asks &ldquo;was that well
              spent?&rdquo; after 1 in 5 sessions for exactly this: each answer tells it whether a
              pause, or the lack of one, was right.
            </li>
            <li>
              Most of the evidence comes from small samples of young adults in the US, Europe and
              Korea. Indian users, and other age groups, may differ.
            </li>
          </ul>
          <Sources sources={[AHMED_2026]} />
        </section>
      </div>
    </main>
  );
}
