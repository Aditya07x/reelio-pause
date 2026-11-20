import type { ReactNode } from "react";

export function PhoneFrame({
  clock,
  children,
  onHome,
  homeLabel,
}: {
  clock: string;
  children: ReactNode;
  onHome?: (() => void) | undefined;
  homeLabel: string;
}) {
  return (
    <div className="relative h-svh w-full sm:h-[min(860px,calc(100svh-3rem))] sm:w-auto sm:aspect-[9/19.3] sm:rounded-[3.4rem] sm:bg-bezel sm:p-[11px] sm:shadow-phone">
      <div className="relative h-full w-full overflow-hidden bg-card sm:rounded-[2.8rem]">
        {/* status bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-7 text-[13px] font-semibold text-foreground/80">
          <span className="tabular-nums">{clock}</span>
          <span className="hidden h-[26px] w-[96px] rounded-full bg-bezel sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="flex items-end gap-[2px]">
              {[5, 7, 9, 11].map((h) => (
                <span key={h} className="w-[3px] rounded-sm bg-foreground/70" style={{ height: h }} />
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
  );
}
