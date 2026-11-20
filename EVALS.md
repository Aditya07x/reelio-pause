# Reelio: evals

What has to be true for Reelio to be worth using, and how each part was checked.

**The claim.** Reelio steps in on Reels sessions that have turned into autopilot, leaves the rest alone, and starts gently before it blocks anything.

That splits into four questions:

1. **Does it leave normal use alone?** Quick checks and engaged watching should never be touched.
2. **Does it catch drift, and when?** Fast, passive scrolling that has strayed from why the person opened the app should be caught, and never before 10 minutes.
3. **Does the ladder escalate correctly?** Step by step, with time between steps, and backing off when the person slows down.
4. **Does it feel like Instagram until it shouldn't?** Swipes, friction and the pause screen.

All evals run against the same pure code the app uses: `src/lib/drift.ts` holds the rules and `src/lib/session.ts` is the reducer.

---

## 1. Automated tests: 42 passing

Run them with `bunx vitest run`.

| Group | Tests | What they pin down |
|---|---|---|
| Evidence and weights | 2 | Weights come from `evidence.ts` and sum to 100. How the session started outweighs minutes in the feed (intention gap β 0.76 vs duration β 0.18, Ahmed et al. 2026). |
| Individual signals | 11 | Each signal's range and edge cases:<br>• fast swipe < 2 s<br>• night = 9 pm–7 am<br>• purpose counts only after 1 min in the feed<br>• time counts from 2× the usual session<br>• in bed needs both sensors<br>• earlier-today load is relative to the person's usual day<br>• likes on watched reels lower the engagement signal, but like-and-swipe and liking nearly everything raise it |
| Scenario evals | 9 | Behaviour patterns from the literature, run through the real reducer (see section 2). |
| Intervention ladder | 6 | The steps fire in order; there are at least 2 min and 5 high reels between steps; the pause never comes before 14 min; 10 calm reels lift everything; an engaged viewer never reaches step 1; swipe distance is ⅓ normally and ⅔ with friction on. |
| Pause message | 3 | Reminds the person of their purpose when there was one, asks an open question when there wasn't, and labels the demo clock. |
| Session flow | 4 | Swiping is blocked while the pause shows; one log row per reel; today's total carries over; the check-in comes in 1 of 5 sessions, only after the session ends. |
| Personal baseline | 6 | Starts at the research numbers. Moves halfway to the person's own mean after k sessions. A habitual skipper's skipping counts less. Check-ins move the threshold (−2 for a regretted session that was never paused, +3 for a paused session the person said was well spent). |
| Routing | 1 | The page loads. |

## 2. Scenario simulation: when does each step fire?

`bun scripts/simulate-ladder.ts` runs each pattern for 40 minutes of feed time through the reducer, pressing "Keep going" at every pause.

| Pattern | Peak score | Step 1 | Step 2 | Step 3 | Pauses |
|---|---|---|---|---|---|
| Quick checker: 20 reels in ~1 s each, then leaves | 50 | never | never | never | 0 |
| Engaged viewer: watches ~14 s, likes 1 in 3, daytime | 38 | never | never | never | 0 |
| Engaged viewer at 11 pm in bed, 90 min earlier today | 63 | never | never | never | 0 |
| Opened the app into Reels, skips 2 of 3, daytime | 65 | 14.0 min | 16.0 min | 18.0 min | 5 |
| Came to reply to a DM, slid into skipping 2 of 3 | 75 | 10.0 min | 12.0 min | 14.0 min | 6 |
| Same, at 11 pm after an hour of Reels earlier | 92 | 10.0 min | 12.0 min | 14.0 min | 6 |
| Feed-training: likes nearly every reel, ~6 s each, daytime | 45 | never | never | never | 0 |
| Feed-training at 11 pm in bed, 60 min earlier today | 67 | 17.6 min | 19.6 min | 21.6 min | 4 |
| Like-and-swipe: likes 1 in 2, leaves in ~1.5 s, daytime | 65 | 13.9 min | 15.9 min | 17.9 min | 5 |
| Slow passive: watches 6 s each, never likes, daytime | 45 | never | never | never | 0 |
| Slow passive at 11 pm in bed | 60 | 19.9 min | 21.9 min | 23.9 min | 4 |

### How a session crosses the threshold

The threshold is 60 points, held for 5 reels in a row, after at least 10 minutes in the feed. Take the DM case at 10 minutes:

| Signal | Points | Why |
|---|---|---|
| How it started | 25 / 25 | Came to reply to a message, still in Reels 10 minutes later |
| Skipping | 20 / 20 | 6–7 of the last 10 left in under 2 s, well above the usual 20% |
| How you engage | 15 / 15 | No like, save or share in the last 10 |
| Time in feed | 6 / 15 | Ramps from 3 to 20 min |
| Night, in bed, earlier today | 0 | Daytime, no earlier use |
| **Total** | **≈ 66** | Over 60 at the 10-minute floor, so step 1 starts there |

Opening straight into Reels scores 15 for how it started, not 25. That session needs about 4 more minutes of the time signal before it reaches 60, which is why step 1 comes at 14 minutes. Night or a long day of Reels before it brings it back to 10.

### What this shows

- **No false alarms on normal use.** Quick checks and engaged viewing are never touched, even at night in bed after 90 minutes of Reels earlier.
- **Drift from a purpose is caught first, at the floor.** Intent drift is the strongest predictor of regret in the literature, and it is the strongest signal here too.
- **The pause screen is the last resort.** It comes 4 minutes after step 1 at the earliest.

### Liking is not always a good sign

An earlier version treated any like as healthy, so liking lowered the score. That misses a known pattern: people like, skip and share on purpose to "train" the recommendation algorithm, and liking reel after reel can itself be autopilot. The original Reelio app already logs this (`LikeStreakLength`, `LikeLatency`, `InteractionDwellRatio`, `InteractionBurstiness`).

The "how you engage" signal now scores whichever of three patterns is strongest in the last 10 reels:
- **Passive:** no like, save or share at all.
- **Like-and-swipe:** liked, then gone within 3 s.
- **Liking nearly everything:** 4+ liked reels in a row, or over 60% liked.

Occasional likes on reels that were actually watched still count as healthy. In the table above, like-and-swipe is caught at 14 min in the daytime. Liking nearly everything at a normal pace is caught only together with other signals (night, in bed, a long day), the same as slow passive watching. The like-and-swipe and liking-everything patterns rest on weaker evidence than the passive one and are first in line for the field test.

## 3. Gaps the simulation found

Both are open, not fixed.

1. **Slow, passive daytime watching is missed.** Watching every reel for about 6 s without liking anything peaks at 45. The skip signal never fires, because nothing is under 2 s, and daytime adds nothing. If field data shows people regret these sessions, the engagement window or the time signal needs more weight. That gets decided with data, not guessed now.
2. **The engaged viewer at night peaks at 63, over the threshold.** They are never stepped in on, because likes keep breaking the 5-reel streak. The streak is doing real work here: without it, this person would get false alarms. It is a narrow margin, and it is the first thing to check in the field.

## 4. Interaction checks (browser, scripted with Playwright)

| Check | Result |
|---|---|
| Slow drag of 15% of the screen | No change of reel |
| Slow drag of 36% of the screen | Next reel (like Instagram, about a third) |
| Quick 10% flick | Next reel |
| With step 1 on: 36% drag | No change (needs two-thirds now) |
| With step 1 on: 70% drag | Next reel, slower slide (950 ms vs 420 ms) |
| Step 2 | Feed fades to grayscale over 2.5 s, and the chip shows minutes in Reels |
| Step 3 | Overlay covers the feed and the video pauses. It shows time, purpose and 2–3 reasons. Close Instagram or Keep going. |
| After Keep going | Feed stays grayscale with a "pauses again in 5 minutes" chip. The next pause has a 5 s wait. |
| Layout | Phones scale uniformly at 1366×640, 1440×900, 1920×1080 and 1024×700; tabs below 1280 px; phone width 390 px |

## 5. How testers can see the ladder in the demo

The ladder only appears for sessions that look like autopilot, so a tester has to scroll like one.

- **Quickest:** the **"Set it up"** button in the *How it decides* panel. It sets "came to reply to a message", 11 pm, an hour of Reels earlier and the ×10 clock. Then swipe through reels in about a second each without liking anything.
  - Step 1 comes after about 1 real minute (10 demo minutes).
  - Steps 2 and 3 follow at about 12 s intervals.
- **By hand:** turn on Demo speed ×10 and swipe fast without liking.
  - From the home screen in daytime, step 1 comes at about 14 demo minutes.
  - Setting the entry to a DM or notification, or turning on 11 pm, brings it to 10.
- The panel always shows how many reels in a row are over the threshold (x/5) and how long until the next step can start.

Nothing in the demo lowers the thresholds. The preset only sets context a phone would read passively.

## 6. Why v1 uses research numbers rather than a fitted model

An earlier attempt fitted a model on one person's logged sessions. Once survey answers were removed from its inputs (they had leaked the label), its correlation with self-reported regret dropped from 0.76 to 0.19. One person's data is not enough to learn from and would bias the model towards that person. So v1 starts every user at numbers from published studies. It then moves towards each person's own pattern with Bayesian shrinkage (`src/lib/baseline.ts`) and adjusts from their "well spent?" answers.

## 7. Field test plan (next)

- **Who:** 6–8 Android users who say they regret some of their Reels time.
- **How:** 2 weeks, with the Reelio Android app logging.
  - Week 1 is detect-only, so nothing is shown.
  - Week 2 turns the ladder on.

| Metric | Target | Why |
|---|---|---|
| Steps that fire in sessions later marked "well spent" | < 20% | False alarms are what get apps uninstalled |
| Sessions marked "not really" that never reached step 1 | < 30% | Misses |
| Time from step 3 to leaving Reels | Median < 60 s | Compare with Meinhardt et al. 2026: pop-up 7 s, gradual 28–56 s |
| Share of sessions ending within 2 min of step 1 or 2 | Rising | Whether the soft steps work alone |
| Daily Reels minutes, week 2 vs week 1 | −15% or more | Grayscale trials report about 20–40 min/day overall |
| Keep going rate at step 3 | Watch the trend | Rising week on week means people are tuning it out |
| Uninstalls or disables | 0 | The bar for "helpful, not annoying" |
