# Reelio

Reelio notices when scrolling Reels stops being a choice and steps in, in three steps: a heavier scroll, then grayscale, then a full-screen pause.

This repo is the clickable prototype, in three panels: **(1)** a simulated Instagram Reels feed you scroll, **(2)** the real Reelio app UI (the Android app's WebView bundle, unchanged, in `public/reelio-app/`), fed live from the simulated session in the same JSON shape the Python model produces (`src/lib/reelio-payload.ts`), so Monitor, Calendar, Dashboard and Settings behave as on the phone, with the four capture states Mindful / Aware / Hooked / Doom, and **(3)** "How it decides", the engine's live working. An Assumptions page cites the research behind every signal.

## What it does

- **Active only while scrolling Reels.** Messages, search, profiles, Stories and the rest of the phone are never scored or interrupted. On Android this uses the Reelio app's existing accessibility-service checks: Instagram's package only; a screen counts as the Reels feed only when a view fills at least 80% of the height, the screen is a vertical pager, and it carries a "Reels" label; a reel is counted only when a full-height swipe settles on a new item; comment and share sheets pause counting; leaving Reels freezes the score. It reads screen structure, not message text.
- **Nothing before or during scrolling.** No prompts at the start. Detection is passive.
- **Seven research-backed signals** add up to a drift score (0–100): how the session started (25), skip rate over the last 10 reels (20), how you engage over the last 10 reels, which counts both watching without any like and reflexive liking such as like-and-swipe or liking nearly everything (15), minutes in the feed (15), night 9 pm–7 am (10), short video earlier today (10), lying still in the dark (5). Weights follow the strength of the evidence. Sources, findings and which numbers are design assumptions: `/assumptions` in the app, or `src/lib/evidence.ts`.
- **Three steps, softest first.** Nothing happens before 10 minutes in the feed. After that, once the score stays at 60+ for 5 reels in a row:
  1. **Heavier scroll.** A swipe has to travel about two-thirds of the screen instead of a third, quick flicks stop working, and reels slide in more slowly.
  2. **Colour drains** (at least 2 minutes and 5 more high reels later). Reels turn grayscale and a small Reelio chip shows the time in Reels.
  3. **Full-screen pause** (again at least 2 minutes and 5 high reels later, so never before 14 minutes). It covers the feed and shows the time, the original purpose if there was one, and the two or three signals behind it. Close Instagram or Keep going; after Keep going it can come back 5 minutes later and asks for a 5-second wait first.

  Ten reels in a row under the threshold lifts everything. The order follows Meinhardt et al. 2026: a pop-up stops scrolling fastest, but gradual cues are tolerated longer, so the gradual ones go first.
- **Visible to the viewer.** The live score sits top-left on the Reels screen, the phone glows in the colour of the active step, a rail beside it lights each step as it turns on (struck through if it lifts), and with friction on a bar shows how far a swipe still has to go.
- **Swiping like Instagram.** A third of the screen, or a quick flick, changes reel.
- **Personal baselines.** Usual session length, skip rate and daily minutes start at research defaults and shift towards the person's own history (shrinkage estimate, like the Android model's UserBaseline). A "sample user" button loads 14 days of synthetic history to show the adaptation.
- **1 in 5 sessions** end with "Was that time well spent?". Answers nudge the person's pause threshold (−2 for a regretted, unpaused session; +3 for a pause on time they were happy with).

## Run it

```
bun install      # or npm install
bun run dev      # http://localhost:8080
bun run test     # 34 tests: unit checks, literature-based scenario evals, baseline tests
```

## Where things live

| Path | What |
|---|---|
| `src/lib/evidence.ts` | Every factor, its weight, evidence strength, sources, the Android columns it maps to, the 100-signal audit, interruption rules |
| `src/lib/drift.ts` | The pure scoring and interruption rules |
| `src/lib/session.ts` | Session state as a pure reducer |
| `src/lib/baseline.ts` | Personal baselines, priors, check-in tuning, synthetic sample users |
| `src/lib/states.ts` | The four capture states and cut-offs (from the Android app) |
| `public/reelio-app/` | The Reelio Android app's UI bundle, unchanged, plus a small stub for the Android bridge |
| `src/lib/reelio-payload.ts` | Builds the app's data payload from the prototype's sessions (driver mapping documented there) |
| `src/lib/drift.test.ts` | Unit tests and scenario evals |
| `src/routes/assumptions.tsx` | The Assumptions page |
| `public/clips/manifest.json` | 27 free Pexels clips (streamed from Pexels, creators credited) |

## Origin: the first Lovable prompt

The first version was generated by Lovable from this prompt (kept verbatim; later changes were made in Claude Code):

> Build a mobile-first web prototype called Reelio, which detects doomscrolling from behaviour and interrupts it.
>
> Show a phone frame containing a generic vertical short-video feed: full-screen cards with abstract gradients and fake captions, swiped up and down. No real brand names or logos.
>
> Nothing appears when a session starts. As the user swipes, compute a live drift score (0–100) from: session length compared with a 9-minute personal baseline, time spent on each card, the share of fast swipes (under 2 seconds), and late-night use. Show it in a small collapsible “how it decides” panel beside the phone.
>
> When the score stays above 70 for 5 cards in a row, show an interruption card between cards: “34 min · ~210 reels. Your usual is 9 min.” with two buttons, Close and Keep going. If the user keeps going, the next interruption needs a 5-second wait before it can be dismissed.
>
> After a session ends, show a one-tap “Was that time well spent?” for 1 in 5 sessions. Add a “demo speed ×10” toggle.
>
> Style: calm, premium,pastel colors, soft typography. Not a generic dashboard.

## Build with Lovable

Continue developing in the [Lovable editor](https://lovable.dev/projects/d2cb0f38-69f4-4393-9130-abfc241d9e3c). Commits pushed to `main` sync back to Lovable.
