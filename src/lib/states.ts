// The four capture states from the Reelio Android app (MonitorScreen.jsx), same cut-offs.

export type StateKey = "mindful" | "aware" | "hooked" | "doom";

export interface CaptureState {
  key: StateKey;
  label: string;
  headline: string;
  blurb: string;
  accent: string;
  bg: string;
}

export const STATES: Record<StateKey, CaptureState> = {
  mindful: {
    key: "mindful",
    label: "MINDFUL",
    headline: "Scrolling with intention.",
    blurb: "Watching, choosing, moving on.",
    accent: "#3A9E6F",
    bg: "#EAF3EE",
  },
  aware: {
    key: "aware",
    label: "AWARE",
    headline: "Mostly in control.",
    blurb: "A few autopilot signals. Nothing to act on yet.",
    accent: "#6B3FA0",
    bg: "#E8E0F5",
  },
  hooked: {
    key: "hooked",
    label: "HOOKED",
    headline: "Running on autopilot.",
    blurb: "Skipping more, doing less. Reelio is watching closely.",
    accent: "#C4973A",
    bg: "#F5F0E2",
  },
  doom: {
    key: "doom",
    label: "DOOM SCROLLING",
    headline: "Deep in the scroll trap.",
    blurb: "If this holds, Reelio pauses the feed at the next reel.",
    accent: "#C4563A",
    bg: "#F5EDE9",
  },
};

export const STATE_CUTS = { aware: 25, hooked: 45, doom: 70 } as const;

export function stateFor(score: number): CaptureState {
  if (score >= STATE_CUTS.doom) return STATES.doom;
  if (score >= STATE_CUTS.hooked) return STATES.hooked;
  if (score >= STATE_CUTS.aware) return STATES.aware;
  return STATES.mindful;
}
