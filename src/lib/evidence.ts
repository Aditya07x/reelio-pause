// Where every factor in the detector comes from. The detector (drift.ts) imports its weights from here,
// so the "How it decides" panel and the Assumptions page can never drift away from the maths.
//
// Strength is a judgement about the evidence, not the weight:
//   strong   = shown in behavioural/log studies of real sessions, effect survives other factors
//   moderate = consistent across studies or shown experimentally, but not tested as a live trigger
//   weak     = a trend, or only survey evidence; kept small and flagged
// "Threshold" text marks which numbers are design assumptions rather than findings.

export type FactorKey = "intent" | "switching" | "passive" | "time" | "night" | "load";
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
export const IQBAL_2008: Source = {
  label: "Iqbal & Bailey 2008, interruptions at breakpoints reduce frustration (CHI '08)",
  url: "https://doi.org/10.1145/1357054.1357070",
};
export const OULASVIRTA_2012: Source = {
  label: "Oulasvirta et al. 2012, checking habits (Pers. Ubiquit. Comput.)",
  url: "https://doi.org/10.1007/s00779-011-0412-2",
};

export const FACTORS: FactorEvidence[] = [
  {
    key: "intent",
    label: "Drift from purpose",
    weight: 30,
    strength: "strong",
    measures:
      "Whether the session started with a purpose (a message, a notification, a search) and has since slid into the recommended feed, or started with no visible purpose at all.",
    finding:
      "The gap between intended and actual use predicted regret about twice as strongly as session length (β 0.76 vs 0.36); with both in the model, length fell to β 0.18. People regret use without a specific goal most, and often slide from messaging into browsing. Recommended content next to purposeful features causes the sidetracking.",
    threshold:
      "Purposeful entries count as drift after 1 minute in the recommended feed, fully after 3 minutes. Opening straight into the feed counts as 0.6 (no visible purpose, which is not proof of none). Both cut-offs are design assumptions.",
    onDevice:
      "Which screen the session starts on and which screen it is on now (DM thread, search, notification target vs the Reels feed), read from the app's screen structure. No question is asked.",
    sources: [AHMED_2026, GUO_2025, CHO_2021],
  },
  {
    key: "switching",
    label: "Rapid switching",
    weight: 20,
    strength: "moderate",
    measures: "Share of recent reels swiped away within 2 seconds.",
    finding:
      "Across seven experiments (N = 1,223), bored people switch videos more, and switching makes them more bored, less satisfied and less attentive. On a TikTok-style feed, swipes cluster just after a video starts or at its end, so an early swipe means rejecting, not watching.",
    threshold:
      "Under 2 s counts as a fast swipe; full weight when half of the last 8 reels are fast. Both numbers are design assumptions.",
    onDevice: "Time between reel changes, from scroll events.",
    sources: [TAM_2024, DASHLET_2022],
  },
  {
    key: "passive",
    label: "Passive watching",
    weight: 15,
    strength: "moderate",
    measures: "Share of recent reels with no like, save, share or comment.",
    finding:
      "Passive social media use and habitual use to pass time were the least meaningful kinds of phone use, with participants describing a loss of autonomy. Passive features (feeds, recommended posts) were regretted more than active ones.",
    threshold:
      "Starts counting when over half of the last 10 reels had no interaction; full weight at 90%. Design assumption.",
    onDevice: "Taps on like/save/share/comment controls.",
    sources: [LUKOFF_2018, CHO_2021, GUO_2025],
  },
  {
    key: "time",
    label: "Time in the feed",
    weight: 15,
    strength: "weak",
    measures: "Minutes spent in the feed this session.",
    finding:
      "Length matters, but less than people assume: β 0.18 once intent is accounted for, and time spent did not predict dissociation in a separate study. Sense of purpose does fade as passive use goes on, so length is kept as a slow-building factor.",
    threshold:
      "Zero for the first 2 minutes (a typical social media session is about 94 seconds), full at 20 minutes, where earlier studies placed their break prompts (15 and 20 min).",
    onDevice: "Foreground time in the feed screen.",
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
    sources: [AHMED_2026, SVA_SLEEP],
  },
  {
    key: "load",
    label: "Already scrolled today",
    weight: 10,
    strength: "moderate",
    measures: "Minutes already spent in short-video feeds today, before this session.",
    finding:
      "Same-day and previous-day screen time were among the strongest predictors of a regretted session in the phone-context model.",
    threshold:
      "Full weight at 90 minutes, about 1.5× the 55–60 minutes a day Bain projects for Indian short-video users. Design assumption.",
    onDevice: "Running total kept on the phone (or Android usage stats).",
    sources: [AHMED_2026],
  },
];

export const WEIGHT_TOTAL = FACTORS.reduce((a, f) => a + f.weight, 0);

/** Things the literature suggests that this version deliberately leaves out, and why. */
export const LEFT_OUT: { label: string; why: string; sources: Source[] }[] = [
  {
    label: "How often the app is re-opened",
    why: "Checking habits are real (brief, repeated checks under 30 s), but people experience them as annoyance rather than addiction, and time since the last session showed no regret effect. Better for a weekly insight than a live trigger.",
    sources: [OULASVIRTA_2012, AHMED_2026],
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
    rule: "Never before 3 minutes in the feed",
    why: "Quick checks and typical sessions (about 94 s) are left alone; regret concentrates in longer, drifting sessions.",
    sources: [OULASVIRTA_2012, AHMED_2026],
  },
  {
    rule: "Only between reels",
    why: "Interruptions at a natural breakpoint cause less frustration and faster responses than immediate ones.",
    sources: [IQBAL_2008],
  },
  {
    rule: "A plain card with an easy Close",
    why: "A simple dismissible pop-up got people to stop faster (median 7 s) than gradual visual or haptic cues; the option to dismiss was the strongest ingredient of one sec.",
    sources: [MEINHARDT_2026, ONESEC_2023],
  },
  {
    rule: "Show elapsed time, and the original purpose if there was one",
    why: "People lose track of time in feeds, and reminding them of their intention beats restricting access.",
    sources: [AHMED_2026, BAUGHAN_2022],
  },
  {
    rule: "At most one pause every 5 minutes; the second asks for a 5-second wait",
    why: "Repeated interruptions that don't fit the moment lead to desensitisation; a short wait adds friction that reduced app openings.",
    sources: [MEINHARDT_2025, ONESEC_2023],
  },
];
