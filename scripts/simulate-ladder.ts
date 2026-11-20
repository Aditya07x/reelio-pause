// Runs behaviour patterns through the real session reducer and prints when each ladder step
// fires. Usage: bun scripts/simulate-ladder.ts   (numbers are reproduced in EVALS.md)
import { createSession, sessionReducer, type SessionState } from "../src/lib/session";
import type { EntryContext } from "../src/lib/drift";

const MIN = 60_000;
interface Persona {
  name: string;
  entry: EntryContext;
  hour: number;
  dailyMinBefore?: number;
  stillInDark?: boolean;
  dwell: (i: number) => number;
  engages?: (i: number) => boolean;
}
const fastBored = (i: number) => (i % 3 === 0 ? 4000 : 1200);
const personas: Persona[] = [
  { name: "Quick checker: 20 reels in ~1 s each, then leaves", entry: "home", hour: 14, dwell: () => 1200 },
  { name: "Engaged viewer: watches ~14 s, likes 1 in 3, daytime", entry: "home", hour: 14, dwell: () => 14_000, engages: (i) => i % 3 === 0 },
  { name: "Engaged viewer at 11 pm in bed, 90 min earlier today", entry: "home", hour: 23, stillInDark: true, dailyMinBefore: 90, dwell: () => 14_000, engages: (i) => i % 3 === 0 },
  { name: "Opened the app into Reels, skips 2 of 3, daytime", entry: "home", hour: 14, dwell: fastBored },
  { name: "Came to reply to a DM, slid into skipping 2 of 3", entry: "dm", hour: 14, dwell: fastBored },
  { name: "Same, at 11 pm after an hour of Reels earlier", entry: "dm", hour: 23, dailyMinBefore: 60, dwell: fastBored },
  { name: "Feed-training: likes nearly every reel, ~6 s each, daytime", entry: "home", hour: 14, dwell: () => 6000, engages: (i) => i % 6 !== 5 },
  { name: "Feed-training at 11 pm in bed, 60 min earlier today", entry: "home", hour: 23, stillInDark: true, dailyMinBefore: 60, dwell: () => 6000, engages: (i) => i % 6 !== 5 },
  { name: "Like-and-swipe: likes 1 in 2, leaves in ~1.5 s, daytime", entry: "home", hour: 14, dwell: () => 1500, engages: (i) => i % 2 === 0 },
  { name: "Slow passive: watches 6 s each, never likes, daytime", entry: "home", hour: 14, dwell: () => 6000 },
  { name: "Slow passive at 11 pm in bed", entry: "home", hour: 23, stillInDark: true, dwell: () => 6000 },
];

function run(p: Persona, minutes = 40) {
  let s: SessionState = createSession(1, 0, { entry: p.entry, dailyMinBefore: p.dailyMinBefore ?? 0, stillInDark: p.stillInDark ?? false });
  const at: Record<number, number> = {};
  const pauses: number[] = [];
  let peak = 0;
  for (let i = 0; s.sessionMs < minutes * MIN && i < 6000; i++) {
    const d = p.dwell(i);
    s = sessionReducer(s, { type: "tick", dtMs: d, speed: 1 });
    if (p.engages?.(i)) s = sessionReducer(s, { type: "engage", id: s.items[s.index]!.id });
    s = sessionReducer(s, { type: "step", dir: 1, dwellMs: d, hour: p.hour });
    peak = Math.max(peak, s.peakScore);
    if (s.level > 0 && at[s.level] === undefined) at[s.level] = s.sessionMs / MIN;
    if (s.overlay) { pauses.push(s.overlay.sessionMs / MIN); s = sessionReducer(s, { type: "keepGoing" }); }
  }
  const f = (v?: number) => (v === undefined ? "never" : `${v.toFixed(1)} min`);
  return `| ${p.name} | ${peak} | ${f(at[1])} | ${f(at[2])} | ${f(at[3])} | ${pauses.length} |`;
}

console.log("| Pattern (40 min in Reels, Keep going at every pause) | Peak score | Step 1 | Step 2 | Step 3 | Pauses |");
console.log("|---|---|---|---|---|---|");
for (const p of personas) console.log(run(p, p.name.startsWith("Quick") ? 0.4 : 40));
