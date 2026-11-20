import { Bookmark, Heart, MessageCircle, Music2, Send } from "lucide-react";
import { memo, useEffect, useRef, type CSSProperties } from "react";
import type { ReelContent } from "@/lib/feed";

function Backdrop({ reel }: { reel: ReelContent }) {
  const [a, b, c, d] = reel.colors;
  const base: CSSProperties = {
    background: `radial-gradient(120% 80% at 15% 10%, ${a} 0%, transparent 60%), radial-gradient(90% 70% at 90% 85%, ${b} 0%, transparent 65%), linear-gradient(165deg, ${c}, ${d})`,
  };
  return (
    <div className="absolute inset-0 overflow-hidden" style={base}>
      {reel.shape === "orb" && (
        <>
          <div
            className="absolute left-1/2 top-[30%] aspect-square w-[78%] -translate-x-1/2 rounded-full opacity-80 blur-[2px] animate-drift-a"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${b}, ${a} 60%, transparent 72%)`,
            }}
          />
          <div
            className="absolute -right-10 top-[8%] aspect-square w-[38%] rounded-full opacity-70 blur-xl animate-drift-b"
            style={{ background: d }}
          />
        </>
      )}
      {reel.shape === "dunes" && (
        <>
          <div
            className="absolute -left-[20%] bottom-[18%] h-[42%] w-[140%] rounded-[50%] opacity-80 animate-drift-b"
            style={{ background: `linear-gradient(180deg, ${a}, transparent)` }}
          />
          <div
            className="absolute -left-[30%] bottom-[-8%] h-[44%] w-[160%] rounded-[50%] opacity-90 animate-drift-a"
            style={{ background: `linear-gradient(180deg, ${b}, ${c})` }}
          />
          <div
            className="absolute right-[14%] top-[16%] aspect-square w-[22%] rounded-full opacity-90 blur-[1px]"
            style={{ background: d }}
          />
        </>
      )}
      {reel.shape === "ribbons" && (
        <>
          <div
            className="absolute left-[-10%] top-[22%] h-[18%] w-[120%] -rotate-12 rounded-full opacity-75 blur-md animate-drift-a"
            style={{ background: `linear-gradient(90deg, ${a}, ${b})` }}
          />
          <div
            className="absolute left-[-20%] top-[46%] h-[14%] w-[130%] rotate-6 rounded-full opacity-70 blur-md animate-drift-b"
            style={{ background: `linear-gradient(90deg, ${d}, ${a})` }}
          />
          <div
            className="absolute left-[-5%] top-[64%] h-[10%] w-[110%] -rotate-3 rounded-full opacity-60 blur-lg animate-drift-a"
            style={{ background: `linear-gradient(90deg, ${b}, ${c})` }}
          />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card/70 via-card/20 to-transparent" />
    </div>
  );
}

/** Only the card on screen plays; neighbours stay loaded and paused so the next swipe is instant. */
function ClipVideo({
  src,
  poster,
  active,
}: {
  src: string;
  poster?: string | undefined;
  active: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);
  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
    />
  );
}

function Action({
  icon: Icon,
  label,
  on = false,
  onPress,
}: {
  icon: typeof Heart;
  label: string;
  on?: boolean;
  onPress?: (() => void) | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={on}
      aria-label={label}
      className="flex flex-col items-center gap-1 no-tap-highlight"
    >
      <span
        className={`grid size-11 place-items-center rounded-full glass shadow-float transition-transform active:scale-90 ${on ? "text-deep" : "text-foreground"}`}
      >
        <Icon className="size-[19px]" strokeWidth={1.7} fill={on ? "currentColor" : "none"} />
      </span>
      <span className="text-[11px] font-medium opacity-85">{label}</span>
    </button>
  );
}

export const ReelCard = memo(function ReelCard({
  reel,
  active = false,
  liked = false,
  onEngage,
}: {
  reel: ReelContent;
  active?: boolean;
  liked?: boolean;
  onEngage?: ((id: number) => void) | undefined;
}) {
  const video = Boolean(reel.clip);
  const engage = onEngage ? () => onEngage(reel.id) : undefined;
  return (
    <div
      className={`relative h-full w-full select-none ${video ? "text-white" : "text-foreground"}`}

      onDoubleClick={engage}
    >
      <Backdrop reel={reel} />
      {reel.clip && (
        <>
          <ClipVideo src={reel.clip.src} poster={reel.clip.poster} active={active} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
        </>
      )}

      <div className="absolute inset-x-0 top-12 flex justify-center gap-5 text-[13px] font-medium">
        <span className="opacity-60">Following</span>
        <span className="relative">
          For you
          <span className="absolute -bottom-1.5 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-current opacity-80" />
        </span>
      </div>

      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4">
        <Action icon={Heart} label={reel.likes} on={liked} onPress={engage} />
        <Action icon={MessageCircle} label={reel.comments} onPress={engage} />
        <Action icon={Bookmark} label="Save" onPress={engage} />
        <Action icon={Send} label={reel.shares} onPress={engage} />
      </div>

      <div className="absolute inset-x-0 bottom-10 pl-5 pr-20">
        <div className="flex items-center gap-2">
          <span
            className="size-8 rounded-full ring-2 ring-card/80"
            style={{ background: `linear-gradient(135deg, ${reel.colors[3]}, ${reel.colors[0]})` }}
          />
          <span className="text-[14px] font-semibold">@{reel.handle}</span>
          <span className="rounded-full border border-current/30 px-2.5 py-0.5 text-[11px] font-medium">
            Follow
          </span>
        </div>
        <p className="mt-2.5 text-[14px] leading-snug opacity-95">
          {reel.caption} <span className="font-semibold opacity-75">{reel.tags.join(" ")}</span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] opacity-75">
          <Music2 className="size-3.5" strokeWidth={1.8} />
          {reel.audio}
        </p>
      </div>
    </div>
  );
});
