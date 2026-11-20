# Reelio: the prompts used to build it

The prototype was built in three tools:

- **Claude:** product thinking, research, and most of the code via Claude Code on this repo.
- **Lovable:** the first version, plus hosting.
- **Claude Code:** the first video feed.

Prompts are grouped by phase, in the order they were given, and kept **verbatim** (typos included). After each one is a line on what it produced and what was decided. Messages that were only "done", screenshots or logistics are left out.

---

## Phase 1: Is this worth building?

> so you have the ps , the deadline is 10pm today , i have also attached the canva link of the doc i will work on thing is , there are two things , either i find a problem , and kind of build a solution for it , or i create a new repo , and present reelio, a little more user centric and refined as the solution to a problem , one also needs to be sure regarding the fact that what we are trying to do with reelio (monitor and reduce doomscrolloing), does it even have a use case , what level and depth of architecture should we build , and how to present it beautifylly […] i do want you to evaluate whether we should nove forward with it or not , dont be a yes man , be critical […] think like an experienced product manager with industry wide experience and help me out build /improve /design this thing

**Produced:** a critical review of the existing Reelio Android app and of whether doomscrolling is a real, measurable problem. Decision: keep Reelio, but narrow it to one job, which is noticing autopilot on Reels and stepping in.

> okay , which one offers more aesthetic value between claude and lovable and is free […] we need to take the feature platform and architectural descisions first before we actually start building , when we have those things finalised , then we can actually build a prd , and leave my labels and all for now , we dont need my evidence to establish that this is actually a problem

**Produced:** the platform decision. A web prototype that simulates a Reels feed is used to show and test the detection logic, and the real product stays an Android accessibility-service app. Platform first, then PRD.

## Phase 2: The core constraint, passive detection

> An escalating ladder: a one-tap reason check... By default it never hard-blocks. see we dont want to do thsis ,, nothing should pop up before an instagram session because htat disrupts the organic flow of scrollign by making hte person conscious, so that is something we want to totally avoid, we want to learn through other behavioural signals(if we decide to do that ) and infer a doomscrolling pattern , so that things remain aligned in place , the technique of detection and interruption itself is very very important here because that is the entire baseline of the app , and if that doesnt work then we can just shift to maybe an other idea alltogether

**Produced:** the main design rule. Nothing is asked before or during a session, and detection is purely from behaviour.

> One question before I write the PRD: may Reelio occasionally ask a single tap after a session has ended... yes it can do that , are we finalised on how we want to present the app , just one worry that i have is that if because we will be simulating instagram feed, since the problem itself is simulated , will the solution hold any meaning?

**Produced:**
- A one-tap "Was that time well spent?" after 1 in 5 sessions, which is the only label Reelio ever asks for.
- The answer to the "simulated" worry: the simulation runs the same detector code that would run on a phone. Every signal it uses maps to a column the Android app already logs.

## Phase 3: The first build (Lovable and Claude Code)

Prompt given to **Lovable** for the first version:

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
> Style: calm, premium,pastel colors, soft typography. Not a generic dashboard.

> 15–20 free-licence vertical stock clips (Pexels / Pixabay)... lets build this , you can give me the prompt for claude to build this long infinite style feed first in phone orientation and once the feed is live we can go forward with the detection

**Produced:** a prompt for Claude Code to build an infinite, phone-shaped vertical feed. The full text is in the chat export.

> loveable created quite a beautiful prototype , really just need to replace it with videos tbh and some minor tweaks and changes here and there what do you think ?

**Produced:**
- Kept Lovable's version as the base.
- Linked it to GitHub (`Aditya07x/reelio-pause`) so every later change is a commit that syncs back to Lovable.

## Phase 4: Grounding the detector in research, not in one person's data

> what factors are we using for evaluation and how grounded are they? or is it just a simulation wiht moving bars , when we say doomscrollng what is the initill assumotion that we begin with , because when user behaviuour mathces with assumption only then will we flag doomscroling right, so what is the assumptions here , and we have a lot of existing architecture inside reelio original repository which we can use for architectural descisions i feel

> see , dont calibrate based on my baseline , conduct extensive research on the literature and material available on this and then build your assumptions , basing it on my use will just create a very biased model which i want to avoid since that is not the aim , so remove all references to my sssions throughout the app , it is not required , so rebuild this as a v1 , search extensively for what factors we can take to associate and then we can build upon it

**Produced:** detector v1, with seven signals weighted from published studies (`src/lib/evidence.ts`), each tagged with its evidence strength and sources. All personal data was removed from the app.

> have it interrupt after atleast 10-15 minutes,. moreover , reelio uses over 100+ behaviouirla signals , yu=ou can run an analysis online to find out which ones can be useful , the current one just feels a little tough to define

**Produced:**
- A 10-minute floor.
- An audit of all ~100 signals the Android app logs, each marked used / later / not used with a reason. It is on the "What it assumes" page.

> Skip rate 20 Share of the last 8 reels... No interaction 15 Share of the last 10 reels... keep the count 10 reels for both also can you please download random clips yourseld and have them inside the app please

**Produced:**
- Both windows set to 10 reels.
- 27 portrait Pexels clips with credits added to the feed.

> please also mention in the writeup that this activates only when a person is scroling reels and not during reggular messaging ,, only when the app detects scrolls (we can tell how we will do that in practice )

**Produced:** the "Active only while scrolling Reels" section, which spells out the Android checks that tell the Reels feed apart from messages:
- Instagram's package only.
- A full-height vertical pager with a "Reels" label.
- A reel counts only once a full-height swipe settles.
- Comment and share sheets pause counting.

## Phase 5: Personal baselines and the real Reelio app

> [voice note, summarised] The score should be derived organically and personalised (Bayesian baselines, as in the Reelio design docs). Show the actual Reelio app environment: session history, flags, the four states from casual to doom. Theme the side calculation panel to Reelio while Instagram keeps its look.

**Produced:**
- Personal baselines: each person starts at research numbers and moves towards their own pattern by Bayesian shrinkage. "Well spent?" answers nudge the threshold.
- The four capture states from the Android app (Mindful, Aware, Hooked, Doom).

> nope i want it exactly like the website i gave you

**Produced:** the real Reelio Android UI, embedded unchanged in the middle phone and fed live from the simulated session in the app's own data format.

> can we fix the aspect ratios on this and make everything consistent please?

**Produced:** both phones render at a fixed 390×844 screen and scale as a whole to fit any window.

## Phase 6: The intervention ladder

> […] we haven't added the intervention screen, which is the most important part of this app. And so when the certain threshold is crossed, first simulate uh, at the backend how under what conditions is that threshold crossed […] we do not want to jeopardize the app's intent in order to show it to the testers […] Just a notification is bound to be ignored, so don't do that. Uh, What we can actually do, the overlay should actually come later, and we can show this in three steps […] the first one could be that we introduce some scrolling friction, that is scrolling becomes a little tough. uh, Also, if we can, let's make the scrolling more organic. Like essentially with Instagram, even if you swipe at 1/3 of the screen, your reels will scroll […] whatever intervention screen or thing you design it exactly on the palette that really existingly follows. Moreover, the calculation screen that you have designed, change its color palette to also the exact same pastel that relay uses. Also remove all AI generated wording if you find any.

**Produced:**
- **The ladder.** Heavier scroll, then grayscale, then a full-screen pause overlay. It is ordered by Meinhardt et al. 2026: a pop-up stops scrolling fastest, while gradual cues are tolerated longer.
- **Instagram-like swipes.** A third of the screen or a quick flick changes reel; with friction on, it takes two-thirds.
- **Panel palette.** The panel and pause screen now use the Reelio app's own pastel set.
- **Tester access without lowering any threshold.** A "Set it up" preset sets context a phone would read passively.
- **Evidence.** The scenario simulation and gaps in `EVALS.md`.
- **Copy.** A plain-language pass over all copy.
