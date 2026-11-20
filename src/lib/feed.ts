// Generic, brand-free fake content for the vertical feed.

export const REEL_COLORS = [
  "var(--reel-peach)",
  "var(--reel-rose)",
  "var(--reel-lilac)",
  "var(--reel-sky)",
  "var(--reel-mint)",
  "var(--reel-sage)",
  "var(--reel-butter)",
  "var(--reel-apricot)",
] as const;

const HANDLES = [
  "softmornings", "field.notes", "tiny.studio", "slowcooked", "quietcorner",
  "paper.and.plum", "ninaplants", "low.tide", "the.daily.walk", "hum.kitchen",
  "loopsandlines", "cloudlog", "olive.atelier", "small.rituals",
];

const CAPTIONS = [
  "morning light through the kitchen window, nothing else",
  "tried the four-ingredient pasta everyone keeps making",
  "pov: you finally clear your desk on a sunday",
  "the sound of rain on a tin roof, 10 hours (not really)",
  "rating every bench in the park, part 7",
  "how I fold fitted sheets now. life-changing? maybe",
  "repotting a plant that did not ask to be repotted",
  "a very slow walk to the bakery",
  "three things I'd tell myself at nineteen",
  "watercolor sky, one brush, no plan",
  "this tiny dog has a full-time job",
  "packing for a weekend with one small bag",
  "the cat discovered the window again",
  "an honest review of my own cooking",
  "ambient bus ride, window seat edition",
  "making tea the long way",
];

const TAGS = ["#slowliving", "#tinywins", "#homecooking", "#pov", "#calm", "#weekend", "#cozy", "#walks"];

const SHAPES = ["orb", "dunes", "ribbons"] as const;
export type ReelShape = (typeof SHAPES)[number];

function hash(n: number) {
  let x = (n + 1) * 2654435761;
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177);
  return (x ^ (x >>> 16)) >>> 0;
}

function pick<T>(arr: readonly T[], seed: number) {
  return arr[seed % arr.length]!;
}

function compact(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export interface ReelContent {
  id: number;
  handle: string;
  caption: string;
  tags: string[];
  audio: string;
  likes: string;
  comments: string;
  shares: string;
  colors: [string, string, string, string];
  shape: ReelShape;
}

export function reelFor(id: number): ReelContent {
  const h = hash(id);
  const c = (k: number) => pick(REEL_COLORS, (h >>> (k * 3)) + k * 3);
  const handle = pick(HANDLES, h >>> 4);
  return {
    id,
    handle,
    caption: pick(CAPTIONS, (h >>> 6) + id),
    tags: [pick(TAGS, h >>> 9), pick(TAGS, (h >>> 12) + 3)].filter((t, i, a) => a.indexOf(t) === i),
    audio: `original sound · ${pick(HANDLES, h >>> 11)}`,
    likes: compact(200 + (h % 48000)),
    comments: compact(10 + ((h >>> 5) % 2400)),
    shares: compact(5 + ((h >>> 8) % 900)),
    colors: [c(0), c(1), c(2), c(3)],
    shape: pick(SHAPES, h >>> 3),
  };
}
