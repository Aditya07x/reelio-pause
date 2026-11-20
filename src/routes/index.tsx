import { createFileRoute, Link } from "@tanstack/react-router";
import { DriftPanel } from "@/components/reelio/drift-panel";
import { EndScreen } from "@/components/reelio/end-screen";
import { Feed } from "@/components/reelio/feed";
import { PhoneFrame } from "@/components/reelio/phone-frame";
import { useReelioSession } from "@/hooks/use-reelio-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reelio — notices doomscrolling and gently interrupts it" },
      {
        name: "description",
        content:
          "A calm prototype that reads swipe behaviour, scores drift from 0 to 100 and pauses the feed when scrolling turns into autopilot.",
      },
      { property: "og:title", content: "Reelio — a gentle pause for the endless feed" },
      {
        property: "og:description",
        content: "Swipe a short-video feed and watch Reelio decide when it's time to pause.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const session = useReelioSession();
  const { state } = session;

  return (
    <main className="min-h-svh bg-page">
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center gap-8 sm:px-6 sm:py-6 md:flex-row md:items-center lg:gap-14">
        <aside className="hidden w-60 shrink-0 lg:block">
          <h1 className="font-soft text-[52px] font-light leading-none">Reelio</h1>
          <p className="mt-4 font-soft text-[19px] font-light italic leading-snug text-muted-foreground">
            Notices when scrolling stops being a choice, and gently says so.
          </p>
          <p className="mt-6 text-[13px] leading-relaxed text-foreground/80">
            Active only while you scroll Reels. Messages, search and the rest of the app are never
            scored or interrupted.
          </p>
          <ul className="mt-6 space-y-3 text-[13px] text-muted-foreground">
            <li>Swipe, scroll or press ↑ ↓ to move through the feed.</li>
            <li>Tap the bar at the bottom of the phone to leave.</li>
            <li>Like or save a reel by tapping the heart or bookmark.</li>
            <li>Turn on demo speed and swipe quickly to meet a pause sooner.</li>
          </ul>
          <Link
            to="/assumptions"
            className="mt-8 inline-flex rounded-full bg-card px-4 py-2 text-[13px] font-medium shadow-soft hover:bg-card/80"
          >
            What it assumes, and why →
          </Link>
        </aside>

        <PhoneFrame
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

        <DriftPanel session={session} />
      </div>
    </main>
  );
}
