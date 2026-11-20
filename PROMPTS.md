# Reelio: how it was built, prompt by prompt

The prototype was built with **Claude**, which handled product thinking, research and most of the code, and **Lovable**, which made the first version and hosts the app. The prompts below are in the order they were given, grouped by stage. They are lightly edited for clarity, with the same asks and the same intent. After each is a short note on what it produced or decided.

---

## 1. Start with the problem, not the product

> I want to work on doomscrolling, specifically on Instagram Reels. Before we build anything, I need to know whether this is a real, measurable problem and not just a feeling people have. Who actually has it, and how would we even tell scrolling that someone enjoys from scrolling that has turned into autopilot?
>
> Be critical, not a yes-man. Think like a product manager with industry-wide experience: what's the use case, how deep should the architecture go for a prototype, and how do we present it well? We also need to keep a clean record of our prompts as we go.

**Decided:** the problem is real and specific. The harm isn't screen time itself but sessions people later regret, and those have measurable behavioural signs. Scope it to one job: notice autopilot on Reels and step in.

> Before anything gets built, let's lock the platform and architecture decisions, then write a PRD. Which tool gives the best design quality for free? And realistically, could this become an app people actually install long term?

**Decided:** a web prototype that simulates the Reels feed, built to show and test the detection logic. The real product is an Android app that uses the accessibility service, which can see the Reels screen without touching Instagram itself.

## 2. The constraint that defines the product

> Nothing should pop up before a session starts. Asking people why they're opening Instagram breaks the natural flow of scrolling and makes them self-conscious, which ruins both the experience and the data. Reelio has to infer doomscrolling passively, from behaviour alone.
>
> How we detect and how we interrupt *is* the product. If that doesn't hold up, we should drop the idea rather than paper over it.

**Decided:** nothing is asked before or during a session, and detection uses behaviour only. This rule shaped everything after it.

> One exception I'm fine with: a single tap after the session ends, asking if it was time well spent, in roughly 1 of 5 sessions. My worry is the demo: if the Instagram feed is simulated, does the solution still mean anything?

**Produced:**
- A one-tap "Was that time well spent?" after 1 in 5 sessions. It's the only thing Reelio ever asks.
- The answer to the "simulated" worry: the simulator runs exactly the same detector code a phone would. Every signal it uses can be read on a real device.

## 3. First build

Prompt given to **Lovable**:

> Build a mobile-first web prototype called Reelio, which detects doomscrolling from behaviour and interrupts it.
>
> Show a phone frame containing a generic vertical short-video feed: full-screen cards with abstract gradients and fake captions, swiped up and down. No real brand names or logos.
>
> Nothing appears when a session starts. As the user swipes, compute a live drift score (0–100) from: session length compared with a 9-minute personal baseline, time spent on each card, the share of fast swipes (under 2 seconds), and late-night use. Show it in a small collapsible "how it decides" panel beside the phone.
>
> When the score stays above 70 for 5 cards in a row, show an interruption card between cards: "34 min · ~210 reels. Your usual is 9 min." with two buttons, Close and Keep going. If the user keeps going, the next interruption needs a 5-second wait before it can be dismissed.
>
> After a session ends, show a one-tap "Was that time well spent?" for 1 in 5 sessions. Add a "demo speed ×10" toggle.
>
> Style: calm, premium, pastel colors, soft typography. Not a generic dashboard.

> The feed has to feel like Reels or none of this lands. Fill it with real vertical video, free-licence stock clips with credits, in an infinite phone-shaped feed. Once that feels right, we move on to detection.

**Produced:**
- A strong first version from Lovable.
- A feed of 27 portrait clips from Pexels, with credits.
- The project linked to GitHub, so every later change is a reviewable commit.

## 4. Ground every assumption in research

> What factors are we actually scoring, and how grounded are they? Right now it risks being a simulation with moving bars. When we call something doomscrolling, what's the starting assumption? We flag it only when behaviour matches that assumption, so the assumption has to be defensible.

> Don't calibrate this on my own usage. One person's data makes a biased model, and that isn't the goal. Research the literature properly, build the assumptions from it, and rebuild this as v1.

**Produced:** detector v1, with seven signals weighted by the strength of published evidence. Each one lists its finding, its sources and which of its numbers are design assumptions. The biggest signal is the gap between why someone opened the app and what they ended up doing, the strongest predictor of regret in the research. Every source is on the in-app "What it assumes" page.

> Never interrupt before 10 to 15 minutes; quick checks have to be left alone. And a phone can log 100+ behavioural signals per reel. Research which ones actually matter rather than guessing.

**Produced:**
- A hard 10-minute floor.
- An audit of about 100 per-reel signals a phone can log. Each is marked used, later, or not used, with the reason.

> Use the same window for skip rate and interaction: the last 10 reels.

> This should only ever run while someone is scrolling Reels, never while they're messaging. Spell out how the app knows the difference.

**Produced:** "Active only while scrolling Reels". The app checks five things:
- It's Instagram, and nothing else.
- A full-height vertical pager labelled Reels is on screen.
- A reel counts only after a full swipe settles on it.
- Comment and share sheets pause counting.
- It reads screen structure, never message text.

## 5. Make it personal without asking anything

> The score should feel organic and personal, not one-size-fits-all. Use Bayesian baselines, so each person starts from the research averages and gradually moves towards their own normal. Show the companion app next to the feed too: session history, the four states from mindful to doom, and a calendar, all updating live from the simulated session.

**Produced:**
- Personal baselines that start at research priors and shrink towards each person's own numbers as sessions add up. "Well spent?" answers nudge the threshold.
- The Reelio companion app beside the feed, fed live: the Monitor, the four capture states, the Calendar and the Dashboard.

> Make sizes and proportions consistent everywhere, so it reads as one product.

## 6. The intervention, the heart of the product

> The intervention is the most important part, so design it properly. A notification gets ignored, so no notifications. It should escalate in three steps:
> 1. **Friction:** scrolling gets slightly harder.
> 2. **Colour drains:** the feed loses its pull.
> 3. **A full-screen pause:** only if the first two didn't work.
>
> Make normal scrolling feel like Instagram first: a third of the screen should be enough to change reel. And show exactly when the threshold gets crossed, without lowering the bar just so testers can see it.

**Produced:** the three-step ladder: heavier scroll, then grayscale, then a full-screen pause that shows the time, the original purpose and what Reelio noticed. It's ordered by the research: a pop-up stops scrolling fastest, but gentler steps are tolerated longer, so the gentle ones go first. Also:
- Instagram-like swipes.
- A "Set it up" preset that reaches the ladder without changing any threshold.

> Use the app's own pastel palette everywhere, and strip out anything that reads as generic or machine-written.

> Liking shouldn't automatically count as healthy. People actively hunt for content they like, and like it on purpose to train the algorithm to serve more of it. That's part of the loop too. Find the research and build it in.

**Produced:** the "How you engage" signal, which now counts reflexive liking (like and swipe straight on, or liking nearly everything) as well as passive watching. Occasional likes on reels someone actually watched still count as healthy.

## 7. Make it easy to evaluate

> An evaluator should see the system working, not take it on trust. Put the live score beside the feed, not inside the Instagram screen, so they can watch it move. Make the three steps tappable in order, 1, then 2, then 3, so each can be felt directly: heavier scroll, then colour gone, then the pause.

> Pre-load about a week of sessions so the companion app has real graphs to explore. Add an End session button, so each new session shows up in the app straight away. Then check the whole flow end to end.

**Produced:**
- A live score with a trend line beside the phone, and steps that unlock in order and glow when they're on.
- An 8-day sample week.
- End and Start session buttons.
- A scripted end-to-end check from a fresh browser, recorded in `EVALS.md`.
