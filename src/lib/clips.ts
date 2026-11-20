import { useEffect, useState } from "react";

export interface Clip {
  src: string;
  poster?: string | undefined;
  /** Short description, used as the reel caption. */
  title?: string | undefined;
  /** Creator credit, shown on the reel. */
  credit?: string | undefined;
  /** Link to the original on the stock site. */
  source?: string | undefined;
  tag?: string | undefined;
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
 * Every reel is a clip. Clips are assigned in sequence, so the same clip never repeats
 * until the whole list has played.
 */
export function clipFor(id: number, clips: Clip[]): Clip | undefined {
  if (!clips.length) return undefined;
  return clips[id % clips.length];
}

/** The next few clips in the list, tried in order if this reel's clip fails to load. */
export function backupsFor(id: number, clips: Clip[], n = 3): Clip[] {
  if (clips.length < 2) return [];
  return Array.from({ length: Math.min(n, clips.length - 1) }, (_, k) => clips[(id + k + 1) % clips.length]!);
}
