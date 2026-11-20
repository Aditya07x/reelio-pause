import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DriftPanel } from "@/components/reelio/drift-panel";
import { EndScreen } from "@/components/reelio/end-screen";
import { Feed } from "@/components/reelio/feed";
import { PhoneFrame } from "@/components/reelio/phone-frame";
import { ReelioAppFrame } from "@/components/reelio/reelio-app-frame";
import { useReelioSession } from "@/hooks/use-reelio-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reelio — notices doomscrolling on Reels and gently interrupts it" },
      {
        name: "description",
        content:
          "Scroll a Reels-style feed and watch the Reelio app classify your session as Mindful, Aware, Hooked or Doom, learn your normal, and pause the feed when scrolling turns into autopilot.",
      },
      { property: "og:title", content: "Reelio — a gentle pause for the endless feed" },
      {
        property: "og:description",
        content: "Scroll the feed on the left; watch Reelio decide on the right.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type View = "feed" | "app" | "engine";
const VIEWS: { id: View; label: string }[] = [
  { id: "feed", label: "Reels" },
  { id: "app", label: "Reelio app" },
  { id: "engine", label: "How it decides" },
];

const PHONE =
  "relative h-[calc(100svh-8.5rem)] w-full sm:h-[min(790px,calc(100svh-10rem))] sm:w-auto";

function Caption({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="mb-3 hidden items-baseline gap-2 sm:flex">
      <span className="font-rmono text-[11px] font-bold text-r-mute">{n}</span>
      <span className="font-grotesk text-[15px] font-bold text-r-ink">{title}</span>
      <span className="font-nunito text-[12px] text-r-mute">{sub}</span>
    </div>
  );
}

function Index() {
  const session = useReelioSession();
  const { state } = session;
  const [view, setView] = useState<View>("feed");
  const show = (v: View) => (view === v ? "flex" : "hidden xl:flex");

  return (
    <main className="bg-reelio min-h-svh font-nunito text-r-ink">
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-4 px-5 pb-4 pt-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-r-mindful">
            <span className="size-4 rounded-full border-[3.5px] border-white/85" />
          </span>
          <div>
            <h1 className="font-grotesk text-[30px] font-bold leading-none">Reelio</h1>
            <p className="mt-1 text-[13px] text-r-mute">
              Notices when scrolling Reels stops being a choice, and gently says so. Active only on
              the Reels feed, never in your messages.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-r-mute">
          <span className="hidden lg:inline">
            Swipe, scroll or ↑ ↓ · tap ♥ to like · bottom bar to leave
          </span>
          <Link
            to="/assumptions"
            className="rounded-full border border-r-line bg-r-paper px-3.5 py-1.5 font-grotesk text-[12px] font-bold text-r-ink hover:bg-r-section"
          >
            What it assumes, and why →
          </Link>
        </div>
      </header>

      <nav
        className="mx-auto mb-3 flex max-w-md gap-1 rounded-full bg-r-nav p-1 xl:hidden"
        aria-label="Views"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={cn(
              "flex-1 rounded-full py-1.5 font-grotesk text-[12px] font-bold transition-colors",
              view === v.id ? "bg-r-blue text-r-ink" : "text-r-ink2/70",
            )}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div className="mx-auto flex max-w-[1440px] items-start justify-center gap-7 px-0 pb-10 sm:px-8">
        <section className={cn(show("feed"), "flex-col items-center")}>
          <Caption n="01" title="Instagram Reels" sub="simulated feed" />
          <PhoneFrame
            size={PHONE}
            clock={session.clock}
            onHome={state.phase === "feed" ? session.close : undefined}
            homeLabel="Leave the feed"
          >
            {state.phase === "feed" ? (
              <Feed session={session} />
            ) : (
              <EndScreen state={state} onAnswer={session.answer} onReopen={session.start} />
            )}
          </PhoneFrame>
        </section>

        <section className={cn(show("app"), "flex-col items-center")}>
          <Caption n="02" title="The Reelio app" sub="the real app UI, fed live" />
          <PhoneFrame size={PHONE} screen="bg-[#EDE8DF]" clock={session.clock} homeLabel="Reelio">
            <ReelioAppFrame session={session} />
          </PhoneFrame>
        </section>

        <section
          className={cn(show("engine"), "w-full max-w-[380px] flex-col px-3 sm:px-0 xl:w-[360px]")}
        >
          <Caption n="03" title="How it decides" sub="the engine, live" />
          <div className="xl:max-h-[min(790px,calc(100svh-10rem))] xl:overflow-y-auto xl:rounded-[22px]">
            <DriftPanel session={session} />
          </div>
        </section>
      </div>
    </main>
  );
}
