// Where every factor in the detector comes from. The detector (drift.ts) imports its weights from here,
// so the "How it decides" panel and the Assumptions page can never drift away from the maths.
//
// Strength is a judgement about the evidence, not the weight:
//   strong   = shown in behavioural/log studies of real sessions, effect survives other factors
//   moderate = consistent across studies or shown experimentally, but not tested as a live trigger
//   weak     = a trend, or only survey evidence; kept small and flagged
// "Threshold" text marks which numbers are design assumptions rather than findings.

export type FactorKey = "entry" | "skips" | "interaction" | "time" | "night" | "bed" | "load";
export type Strength = "strong" | "moderate" | "weak";

export interface Source {
  label: string;
  url: string;
}

export interface FactorEvidence {
  key: FactorKey;
  label: string;
  weight: number;
  strength: Strength;
  /** What the factor measures, in plain words. */
  measures: string;
  /** Why it is in the model: the finding. */
  finding: string;
  /** How the numbers in drift.ts were chosen; says plainly when they are assumptions. */
  threshold: string;
  /** How a real phone could observe it without asking the user anything. */
  onDevice: string;
  /** The columns the Reelio Android app already logs for this. */
  reelioColumns: string[];
  sources: Source[];
}

export const AHMED_2026: Source = {
  label: "Ahmed et al. 2026, Predicting Regretful Social Media Sessions (MIT Media Lab / HPI)",
  url: "https://arxiv.org/abs/2606.08965",
};
const GUO_2025: Source = {
  label: "Guo et al. 2025, What Social Media Use Do People Regret? (CHI '25)",
  url: "https://arxiv.org/abs/2410.11354",
};
const CHO_2021: Source = {
  label: "Cho et al. 2021, Reflect, not Regret (CSCW '21, Best Paper)",
  url: "https://doi.org/10.1145/3479600",
};
const LUKOFF_2018: Source = {
  label: "Lukoff et al. 2018, What Makes Smartphone Use Meaningful or Meaningless? (IMWUT)",
  url: "https://doi.org/10.1145/3191754",
};
const TAM_2024: Source = {
  label: "Tam & Inzlicht 2024, digital switching and boredom (J. Exp. Psych.: General)",
  url: "https://www.apa.org/news/press/releases/2024/08/online-videos-boredom",
};
const DASHLET_2022: Source = {
  label: "Li et al. 2022, Dashlet: swipe-time distributions on a TikTok-like feed",
  url: "https://arxiv.org/abs/2204.12954",
};
const BAUGHAN_2022: Source = {
  label: "Baughan et al. 2022, normative dissociation on social media (CHI '22)",
  url: "https://www.newswise.com/pdf_docs/165332634173671_Dissociation.pdf",
};
const MEINHARDT_2025: Source = {
  label: "Meinhardt et al. 2025, Scrolling in the Deep (CHI '25)",
  url: "https://arxiv.org/abs/2501.11814",
};
export const MEINHARDT_2026: Source = {
  label: "Meinhardt et al. 2026, Can't Stop: interventions for short-video infinite scrolling",
  url: "https://arxiv.org/abs/2607.15818",
};
const SVA_SLEEP: Source = {
  label: "Zhao & Kou 2024, short-video addiction, procrastination and sleep quality",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10808398/",
};
export const ONESEC_2023: Source = {
  label: "Grüning et al. 2023, the self-nudge app one sec (PNAS)",
  url: "https://doi.org/10.1073/pnas.2213114120",
};
const RUIZ_2024: Source = {
  label: "Ruiz, Molina León & Heuer 2024, Design Frictions on Social Media (Mensch und Computer '24)",
  url: "https://arxiv.org/abs/2407.18803",
};
const HOLTE_2020: Source = {
  label: "Holte et al., grayscale and problematic smartphone use (Current Psychology), following Holte & Ferraro 2020",
  url: "https://link.springer.com/doi/10.1007/s12144-021-02020-y",
};
const ZIMMERMANN_2023: Source = {
  label: "Zimmermann & Sobolev 2023, Digital Strategies for Screen Time Reduction (Cyberpsychology, Behavior, and Social Networking)",
  url: "https://pubmed.ncbi.nlm.nih.gov/36577008/",
};
export const IQBAL_2008: Source = {
  label: "Iqbal & Bailey 2008, interruptions at breakpoints reduce frustration (CHI '08)",
  url: "https://doi.org/10.1145/1357054.1357070",
};
export const HEITMAYER_2021: Source = {
  label: "Heitmayer & Lahlou 2021, Why are smartphones disruptive? (Computers in Human Behavior)",
  url: "https://researchonline.lse.ac.uk/id/eprint/107820",
};
const LEE_2014: Source = {
  label: "Lee et al. 2014, Hooked on Smartphones: overuse in logged data (CHI '14)",
  url: "https://ic.kaist.ac.kr/files/papers/lee2014hooked.pdf",
};
const KHEIRINEJAD_2022: Source = {
  label: "Kheirinejad et al. 2022, Leave your smartphone out of bed (Pers. Ubiquit. Comput.)",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9643910/",
};
export const OULASVIRTA_2012: Source = {
  label: "Oulasvirta et al. 2012, checking habits (Pers. Ubiquit. Comput.)",
  url: "https://doi.org/10.1007/s00779-011-0412-2",
};

export const FACTORS: FactorEvidence[] = [
  {
    key: "entry",
    label: "How the session started",
    weight: 25,
    strength: "strong",
    measures:
      "The route into the feed: opened from the home screen with nothing else on screen, or arrived for something specific (a message, a notification, a search) and then moved into the Reels feed, or switched over from a work or study app.",
    finding:
      "The gap between what people meant to do and what they did predicted regret about twice as strongly as session length (β 0.76 vs 0.36). Use without a specific goal is the most regretted, and people often slide from messaging into browsing. Self-started phone sessions run longer and are more distraction-seeking than notification-started ones, and in an overuse study the at-risk group's notification-started chains of use were longer.",
    threshold:
      "Home screen start = 0.6 (no visible purpose, which is not proof of none). Work or study app = 0.8. Message, notification or search = 0 for the first minute in the feed, rising to 1 at 3 minutes (they came for something else and stayed). Values are design assumptions.",
    onDevice:
      "The app that was on screen just before, whether a notification opened it, and which screen the session is on now (chat, search, Reels feed).",
    reelioColumns: [
      "DirectLaunch",
      "SessionTriggeredByNotif",
      "PreviousAppCategory",
      "PreviousApp",
    ],
    sources: [AHMED_2026, GUO_2025, HEITMAYER_2021, LEE_2014, CHO_2021],
  },
  {
    key: "skips",
    label: "Skip rate",
    weight: 20,
    strength: "moderate",
    measures: "Share of the last 10 reels left within 2 seconds.",
    finding:
      "Across seven experiments (N = 1,223), bored people switch videos more, and switching makes them more bored, less satisfied and less attentive. On a TikTok-style feed, swipes cluster just after a video starts or at its end, so an early swipe means rejecting, not watching.",
    threshold:
      "Under 2 s counts as a skip; full weight when half of the last 10 reels are skips. Both are design assumptions.",
    onDevice: "Time between reel changes, from scroll events.",
    reelioColumns: ["DwellTime", "ScrollStreak", "CumulativeReels"],
    sources: [TAM_2024, DASHLET_2022],
  },
  {
    key: "interaction",
    label: "No interaction",
    weight: 15,
    strength: "moderate",
    measures:
      "Share of the last 10 reels with no like, save, share, comment, profile visit or hashtag tap: watching without doing anything.",
    finding:
      "Passive social media use and habitual use to pass time were the least meaningful kinds of phone use, with participants describing a loss of autonomy. Passive features (feeds, recommended posts) were regretted more than active ones.",
    threshold:
      "Starts counting when over half of the last 10 reels had no action; full weight at 90%. Design assumption.",
    onDevice: "Taps on the like, save, share and comment controls, profile opens and hashtag taps.",
    reelioColumns: [
      "Liked",
      "Saved",
      "Shared",
      "Commented",
      "ProfileVisits",
      "HashtagTaps",
      "InteractionRate",
    ],
    sources: [LUKOFF_2018, CHO_2021, GUO_2025],
  },
  {
    key: "time",
    label: "Minutes in the feed",
    weight: 15,
    strength: "weak",
    measures: "Minutes spent in the Reels feed this session.",
    finding:
      "Length matters less than people assume: β 0.18 once intent is in the model, and time spent did not predict the spaced-out, mindless state in a separate study. A sense of purpose does fade as passive use goes on, so length builds slowly.",
    threshold:
      "Zero for the first 2 minutes (a typical social media session is about 94 seconds), full at 20 minutes, where earlier studies placed their break prompts (15 and 20 min).",
    onDevice: "Foreground time on the Reels feed screen.",
    reelioColumns: ["DwellTime", "StartTime", "EndTime"],
    sources: [AHMED_2026, BAUGHAN_2022, LUKOFF_2018, MEINHARDT_2025],
  },
  {
    key: "night",
    label: "Night",
    weight: 10,
    strength: "moderate",
    measures: "Whether the session is between 9 pm and 7 am.",
    finding:
      "Night sessions were regretted more even after controlling for length (β 0.30). Survey studies link short-video addiction with bedtime procrastination and poorer sleep.",
    threshold: "Uses the study's 9 pm–7 am window as is.",
    onDevice: "Device clock.",
    reelioColumns: ["TimePeriod", "CircadianPhase", "SleepProxyScore"],
    sources: [AHMED_2026, SVA_SLEEP],
  },
  {
    key: "bed",
    label: "Lying still in the dark",
    weight: 5,
    strength: "weak",
    measures: "Phone held still with the room dark: a rough sign of scrolling in bed.",
    finding:
      "Smartphone use in bed worsened sleep latency, time awake and heart-rate measures, while use outside bed did not lower sleep quality. Movement features (accelerometer variability, steps) were among those retained for predicting regretted sessions.",
    threshold:
      "Counts only when both the motion and light sensors agree. Detecting 'in bed' this way is a design assumption and the weight is kept small.",
    onDevice: "Accelerometer variance and the ambient light sensor.",
    reelioColumns: ["IsStationary", "AccelVariance", "IsScreenInDarkRoom", "AmbientLuxStart"],
    sources: [KHEIRINEJAD_2022, AHMED_2026],
  },
  {
    key: "load",
    label: "Earlier today",
    weight: 10,
    strength: "moderate",
    measures: "Minutes already spent in short-video feeds today, before this session.",
    finding:
      "Same-day and previous-day screen time were among the strongest predictors of a regretted session. In an overuse study, total daily time separated the at-risk group while how often they opened the phone did not.",
    threshold:
      "Full weight at 90 minutes, about 1.5× the 55–60 minutes a day Bain projects for Indian short-video users. Design assumption.",
    onDevice: "A running total kept on the phone, or Android usage stats.",
    reelioColumns: ["ScreenOnDuration1hr", "(daily total: new)"],
    sources: [AHMED_2026, LEE_2014],
  },
];

export const WEIGHT_TOTAL = FACTORS.reduce((a, f) => a + f.weight, 0);

/** Things the literature suggests that this version deliberately leaves out, and why. */
export const LEFT_OUT: { label: string; why: string; sources: Source[] }[] = [
  {
    label: "How often the app is re-opened",
    why: "Checking habits are real (brief, repeated checks under 30 s), but people experience them as annoyance rather than addiction. Time since the last session showed no regret effect, and session frequency did not separate overusers from others. Better for a weekly insight than a live trigger.",
    sources: [OULASVIRTA_2012, AHMED_2026, LEE_2014],
  },
  {
    label: "Doomscrolling as negative news",
    why: "The validated Doomscrolling Scale defines it as compulsive scanning for negative news. Reelio can't judge content without reading it, so it targets the broader, content-blind pattern (regretted, purpose-less, passive scrolling).",
    sources: [
      {
        label: "Sharma et al. 2022 definition, validated in Satici et al. 2022",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9580444",
      },
    ],
  },
  {
    label: "Heart rate and movement",
    why: "Wearable signals added little over phone context on average, and only helped some people.",
    sources: [AHMED_2026],
  },
];

/** Rules about when and how to interrupt, separate from whether to. */
export const INTERRUPT_RULES: { rule: string; why: string; sources: Source[] }[] = [
  {
    rule: "Never before 10 minutes in the feed",
    why: "Quick checks and typical sessions (about 94 s) are left alone, and a high bar keeps false alarms rare: blockers that misread meaningful time get bypassed or switched off. Earlier studies stepped in at 15 to 20 minutes; 10 is the floor for step 1.",
    sources: [OULASVIRTA_2012, AHMED_2026, MEINHARDT_2025],
  },
  {
    rule: "Three steps, softest first: heavier scroll, then grayscale, then a full-screen pause",
    why: "In a field study on Reels and TikTok, a pop-up got people to stop fastest (median 7 s vs 56 s for a gradual visual cue), but the gradual cue was tolerated about 2.5 times longer before it annoyed. So Reelio starts with steps that don't block anything and only covers the feed if they don't work.",
    sources: [MEINHARDT_2026],
  },
  {
    rule: "Step 1: a swipe needs two-thirds of the screen instead of a third",
    why: "Adding effort to the scroll itself reduced mindless scrolling and helped people feel in control, without a screen to dismiss. A short delay before opening an app was the core of one sec, which cut how often people opened the apps it guarded.",
    sources: [RUIZ_2024, ONESEC_2023],
  },
  {
    rule: "Step 2: Reels turn grayscale",
    why: "Grayscale makes the feed less rewarding to look at. In several trials it cut daily screen time, and it worked faster than setting time limits.",
    sources: [HOLTE_2020, ZIMMERMANN_2023],
  },
  {
    rule: "At least 2 minutes and 5 high-scoring reels between steps",
    why: "Each step gets a fair chance to work before the next one. If the score stays under the threshold for 10 reels in a row, everything lifts and the feed is back to normal. This is a design choice to be tested.",
    sources: [],
  },
  {
    rule: "Step 3 shows time, the original purpose, and what Reelio noticed",
    why: "People lose track of time in feeds, and reminding them of their intention works better than restricting access. Listing the two or three signals behind the pause keeps it from feeling arbitrary.",
    sources: [AHMED_2026, BAUGHAN_2022],
  },
  {
    rule: "Only between reels, always with an easy way out",
    why: "Interruptions at a natural break cause less frustration. Being able to dismiss was the strongest ingredient of one sec, so Keep going is always there.",
    sources: [IQBAL_2008, ONESEC_2023],
  },
  {
    rule: "The pause can come back after 5 minutes, with a 5-second wait",
    why: "Repeated interruptions that don't fit the moment lead to people tuning them out; a short wait adds friction without blocking.",
    sources: [MEINHARDT_2025, ONESEC_2023],
  },
];

/**
 * Audit of the ~100 per-reel signals the Reelio Android app logs (CSV schema v5),
 * grouped, against the literature above. "used" feeds a factor; "later" has some
 * support but needs testing first; "not used" has no evidence linking it to regret
 * or meaningless use, duplicates a used signal, or is not implemented yet.
 */
export type AuditVerdict = "used" | "later" | "not used";

export const SIGNAL_AUDIT: {
  group: string;
  columns: string;
  verdict: AuditVerdict;
  note: string;
}[] = [
  {
    group: "Entry route",
    columns: "DirectLaunch, SessionTriggeredByNotif, PreviousApp, PreviousAppCategory",
    verdict: "used",
    note: "How the session started. Strongest evidence of any signal.",
  },
  {
    group: "Time per reel",
    columns: "DwellTime, ScrollStreak, CumulativeReels",
    verdict: "used",
    note: "Skip rate, and minutes and reels in the feed.",
  },
  {
    group: "Active actions",
    columns: "Liked, Saved, Shared, Commented, ProfileVisits, HashtagTaps, InteractionRate",
    verdict: "used",
    note: "No interaction = passive watching. Profile visits and hashtag taps count as active.",
  },
  {
    group: "Clock",
    columns: "TimePeriod, CircadianPhase, SleepProxyScore",
    verdict: "used",
    note: "Night, 9 pm – 7 am.",
  },
  {
    group: "Motion and light",
    columns: "IsStationary, AccelVariance, IsScreenInDarkRoom, AmbientLuxStart",
    verdict: "used",
    note: "Lying still in the dark, a rough in-bed sign. Small weight.",
  },
  {
    group: "Recent screen time",
    columns: "ScreenOnDuration1hr, ScreenOnCount1hr",
    verdict: "used",
    note: "Feeds 'earlier today'. Needs a daily total added; the count of screen-ons is not used (frequency did not separate overusers).",
  },
  {
    group: "Leaving and coming back",
    columns: "AppExitAttempts, ReturnLatencyS",
    verdict: "later",
    note: "Matches the 'outer loop' of habitual returns described in infinite-scroll research, but no study tested it against regret yet.",
  },
  {
    group: "Re-watching",
    columns: "BackScrollCount",
    verdict: "later",
    note: "Scrolling back into already-seen posts was linked to more dissociation, but only on a Twitter-like app.",
  },
  {
    group: "Attention drift within a session",
    columns: "InteractionDropoff, EarlyVsLateRatio, SessionDwellTrend",
    verdict: "later",
    note: "Sense of purpose fades as passive use goes on; worth testing as an early sign, once there is data to test it.",
  },
  {
    group: "Re-opening frequency",
    columns: "TimeSinceLastSessionMin, ScreenOnCount1hr",
    verdict: "not used",
    note: "No regret effect, and session frequency did not separate overusers. Kept for weekly insights.",
  },
  {
    group: "Scroll mechanics",
    columns:
      "AvgScrollSpeed, MaxScrollSpeed, ScrollIntervalCV, ScrollRhythmEntropy, ScrollBurstDuration, InterBurstRestDuration, ScrollPauseCount, SwipeCompletionRatio, ScrollDirection",
    verdict: "not used",
    note: "No published link to regret found; what matters in them is already captured by skip rate.",
  },
  {
    group: "Running dwell statistics",
    columns: "RollingMean, RollingStd, DwellTimeZscore, DwellTimePctile, DwellAcceleration",
    verdict: "not used",
    note: "Derived from time per reel; redundant with skip rate in this version.",
  },
  {
    group: "Interaction details",
    columns:
      "LikeLatency, CommentLatency, ShareLatency, SaveLatency, InteractionDwellRatio, InteractionBurstiness, LikeStreakLength, SavedWithoutLike, CommentAbandoned",
    verdict: "not used",
    note: "Finer cuts of the same active-vs-passive signal with no separate evidence.",
  },
  {
    group: "Content",
    columns:
      "HasCaption, CaptionExpanded, HasAudio, IsAd, AdSkipLatencyMs, UniqueAudioCount, RepeatContentFlag, ContentRepeatRate",
    verdict: "not used",
    note: "No evidence linking these to regret; repeat-content columns are not implemented yet.",
  },
  {
    group: "Device state",
    columns:
      "BatteryStart, BatteryDeltaPerSession, IsCharging, Headphones, AudioOutputType, DeviceOrientation, PostureShiftCount, MicroMovementRms, LuxDelta, NightMode, DND",
    verdict: "not used",
    note: "Used in boredom-detection research, but boredom is not regret; no direct evidence. MicroMovementRms is not implemented.",
  },
  {
    group: "Notifications during the session",
    columns: "NotificationsDismissed, NotificationsActedOn",
    verdict: "not used",
    note: "No evidence found linking these to regretted scrolling.",
  },
  {
    group: "Calendar and sleep estimates",
    columns: "DayOfWeek, IsWeekend, IsHoliday, EstimatedSleepDurationH, ConsistencyScore",
    verdict: "not used",
    note: "Weekly patterns, not live signals; overlaps with night.",
  },
  {
    group: "Self-reports",
    columns:
      "PostSessionRating, RegretScore, MoodBefore, MoodAfter, IntendedAction, ComparativeRating",
    verdict: "later",
    note: "Not detector inputs. The 1-in-5 post-session check-in is how the detector would be tested and tuned.",
  },
];

/**
 * When Reelio is active. Mirrors the Reelio Android app's existing detection code
 * (InstaAccessibilityService.kt and ReelContextDetector.kt).
 */
export const ACTIVATION = {
  summary:
    "Reelio only watches the Reels feed. Messaging, search, profiles, Stories and everything else on the phone are ignored: no score, no timer, no pause.",
  steps: [
    {
      title: "Only Instagram",
      body: "The Android accessibility service drops every event that does not come from Instagram's app package before doing anything else.",
    },
    {
      title: "Only the Reels screen",
      body: "A screen counts as the Reels feed only when three things are true at once: a view fills at least 80% of the screen height, the screen is built on a vertical pager, and the screen carries a 'Reels' label. A chat thread, the search page or a profile fails at least one of these.",
    },
    {
      title: "Only full-screen swipes",
      body: "A reel is counted when a full-height vertical scroll settles on a new item (a 150 ms settle check filters jitter). Partial-height scrolls, like scrolling a comment section, are ignored.",
    },
    {
      title: "Sheets pause counting",
      body: "When a comment, share or send-to sheet opens on top of a reel, counting stops until it closes, so replying to someone from Reels is not counted as scrolling.",
    },
    {
      title: "Leaving Reels freezes the score",
      body: "Moving to messages or any other screen stops the clock. Coming back resumes it; after 5 minutes away the session ends and the next one starts fresh.",
    },
  ],
  privacy:
    "The service reads the screen's structure (view types, sizes and labels) only to answer one question: is this the Reels feed? It logs timings and taps on the Reels screen. It does not store message text, captions or what the videos show.",
  limits:
    "This relies on Android's accessibility service, which needs explicit user consent and a Play Store declaration, and an Instagram redesign can break the screen check. iOS does not let apps see inside other apps, so an iPhone version could only use time-based signals.",
  demoNote:
    "In this prototype the phone shows only a Reels-style feed, so it is always active. The 'How the session started' setting stands in for what happened before the person reached Reels.",
};
