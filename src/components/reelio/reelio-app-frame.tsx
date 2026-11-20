// The real Reelio app UI (the Android app's WebView bundle, unchanged) running in an iframe,
// fed live from the simulated Reels session in the same payload shape the Python model produces.
import { useCallback, useEffect, useRef } from "react";
import { lastEndOf, summarise, type ReelioSession } from "@/hooks/use-reelio-session";
import { buildPayload, driversFrom } from "@/lib/reelio-payload";
import { reelsSeen } from "@/lib/session";

export function ReelioAppFrame({ session }: { session: ReelioSession }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const { state, drift, history, clearHistory } = session;

  const live = state.phase === "feed" && reelsSeen(state) > 1;
  const second = Math.floor(state.sessionMs / 1000);

  const post = useCallback(() => {
    const win = ref.current?.contentWindow;
    if (!win) return;
    const now = Date.now();
    const lastEnd = lastEndOf(history);
    const liveSession = live
      ? {
          summary: {
            ...summarise(state, history.length + 1, now, drift, lastEnd),
            drivers: driversFrom(
              drift.parts,
              state,
              lastEnd
                ? Math.max(0, ((state.startedAt || now - state.sessionMs) - lastEnd) / 60000)
                : null,
            ),
          },
          score: drift.score,
        }
      : null;
    win.postMessage(
      { type: "reelio-payload", payload: buildPayload(history, liveSession, now) },
      "*",
    );
    // Depend on coarse signals only, so the app re-renders about once a second, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, live, state.dwells.length, state.phase, second, state.pauseCount, drift.score]);

  useEffect(() => {
    post();
  }, [post]);

  // The app's Settings → "Clear data" asks the parent to wipe history.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && e.data?.type === "reelio-clear")
        clearHistory();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [clearHistory]);

  return (
    <iframe
      ref={ref}
      src="/reelio-app/index.html"
      title="The Reelio app"
      onLoad={() => {
        post();
        // The bundle registers its data callback shortly after load; send again once it has.
        window.setTimeout(post, 600);
      }}
      className="absolute inset-x-0 bottom-0 top-11 h-[calc(100%-2.75rem)] w-full border-0 bg-[#EDE8DF]"
    />
  );
}
