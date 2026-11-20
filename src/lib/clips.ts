import { useEffect, useState } from "react";

export interface Clip {
  src: string;
  poster?: string | undefined;
}

/** Deterministic shuffle so the feed order is stable between reloads but not alphabetical. */
function shuffled<T>(arr: T[]) {
  const out = [...arr];
  let seed = 7;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Loads public/clips/manifest.json ({ clips: [{ src, poster }] }).
 * Missing or empty manifest → [] and the feed falls back to generated gradient cards.
 */
export function useClips() {
  const [clips, setClips] = useState<Clip[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/clips/manifest.json")
      .then((r) => (r.ok ? r.json() : { clips: [] }))
      .then((m: { clips?: Clip[] }) => alive && setClips(shuffled(m.clips ?? [])))
      .catch(() => alive && setClips([]));
    return () => {
      alive = false;
    };
  }, []);
  return clips;
}

/**
 * Roughly 3 clips : 1 generated card. Clips are assigned in sequence, so the same clip
 * never repeats until the whole list has played (with 15+ clips, never within 6 cards).
 */
export function clipFor(id: number, clips: Clip[]): Clip | undefined {
  if (!clips.length || id % 4 === 3) return undefined;
  const seq = id - Math.floor(id / 4);
  return clips[seq % clips.length];
}
