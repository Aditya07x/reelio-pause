import { useEffect, useState, type ReactNode } from "react";

/** Logical device size. Everything inside renders at this size and the whole phone is scaled to fit. */
export const SCREEN_W = 390;
export const SCREEN_H = 844;
const BEZEL = 11;
export const PHONE_W = SCREEN_W + BEZEL * 2;
export const PHONE_H = SCREEN_H + BEZEL * 2;

/**
 * One scale for every phone on the page: fit the available height (window minus header) and width,
 * never upscale. Uniform scaling keeps the embedded Reelio app at its real 390 px layout.
 */
export function usePhoneScale(reservedH = 150, columns = 1, reservedW = 48) {
  const [scale, setScale] = useState(0.8);
  useEffect(() => {
    const update = () => {
      const byH = (window.innerHeight - reservedH) / PHONE_H;
      const byW = (window.innerWidth - reservedW) / (PHONE_W * columns);
      setScale(Math.max(0.45, Math.min(1, byH, byW)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [reservedH, columns, reservedW]);
  return scale;
}

export function PhoneFrame({
  clock,
  children,
  onHome,
  homeLabel,
  scale = 1,
  screen = "bg-card",
}: {
  clock: string;
  children: ReactNode;
  onHome?: (() => void) | undefined;
  homeLabel: string;
  /** Uniform scale applied to the whole device. */
  scale?: number;
  screen?: string;
}) {
  return (
    <div className="relative shrink-0" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
      <div
        className="absolute left-0 top-0 origin-top-left rounded-[3.4rem] bg-bezel shadow-phone"
        style={{ width: PHONE_W, height: PHONE_H, padding: BEZEL, transform: `scale(${scale})` }}
      >
        <div className={`relative h-full w-full overflow-hidden rounded-[2.8rem] ${screen}`}>
          {/* status bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-7 text-[13px] font-semibold text-foreground/80">
            <span className="tabular-nums">{clock}</span>
            <span className="h-[26px] w-[96px] rounded-full bg-bezel" />
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]">
                {[5, 7, 9, 11].map((h) => (
                  <span
                    key={h}
                    className="w-[3px] rounded-sm bg-foreground/70"
                    style={{ height: h }}
                  />
                ))}
              </span>
              <span className="ml-1 h-[11px] w-[22px] rounded-[3px] border border-foreground/50 p-[1.5px]">
                <span className="block h-full w-3/4 rounded-[1.5px] bg-foreground/70" />
              </span>
            </span>
          </div>

          {children}

          {/* home bar = leave the app */}
          <button
            type="button"
            onClick={onHome}
            disabled={!onHome}
            aria-label={homeLabel}
            title={homeLabel}
            className="group absolute bottom-0 left-1/2 z-20 flex h-8 w-40 -translate-x-1/2 cursor-pointer items-center justify-center disabled:cursor-default"
          >
            <span className="h-[5px] w-32 rounded-full bg-foreground/45 transition-all group-hover:w-36 group-hover:bg-foreground/70 group-disabled:w-32 group-disabled:bg-foreground/25" />
          </button>
        </div>
      </div>
    </div>
  );
}
