// Origami mascots, ported from the Reelio Android app (screens/MonitorScreen.jsx → MoodFace).
import { stateFor, type StateKey } from "@/lib/states";

const INK = "#1A1612";

function Face({ type, accent }: { type: StateKey; accent: string }) {
  switch (type) {
    case "mindful":
      return (
        <g>
          <defs>
            <linearGradient id="rMindful" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4BB882" />
              <stop offset="60%" stopColor="#3A9E6F" />
              <stop offset="100%" stopColor="#2E7E57" />
            </linearGradient>
          </defs>
          <circle cx="35" cy="35" r="22" fill="url(#rMindful)" />
          <circle cx="65" cy="35" r="22" fill="url(#rMindful)" />
          <circle cx="35" cy="65" r="22" fill="url(#rMindful)" />
          <circle cx="65" cy="65" r="22" fill="url(#rMindful)" />
          <rect x="35" y="35" width="30" height="30" fill="url(#rMindful)" />
          <polygon points="50,13 50,87 65,35" fill="rgba(255,255,255,0.18)" />
          <polygon points="13,50 87,50 35,65" fill="rgba(0,0,0,0.12)" />
          <path
            d="M 32 48 Q 38 56 44 48 M 56 48 Q 62 56 68 48"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 42 62 Q 50 70 58 62"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
    case "aware":
      return (
        <g>
          <defs>
            <linearGradient id="rAware" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8357B8" />
              <stop offset="50%" stopColor="#6B3FA0" />
              <stop offset="100%" stopColor="#512A80" />
            </linearGradient>
          </defs>
          <path
            d="M 50 15 L 85 32 L 85 68 L 50 85 L 15 68 L 15 32 Z"
            fill="url(#rAware)"
            stroke={accent}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon points="50,15 85,32 50,50" fill="rgba(255,255,255,0.22)" />
          <polygon points="85,32 85,68 50,50" fill="rgba(0,0,0,0.08)" />
          <polygon points="85,68 50,85 50,50" fill="rgba(0,0,0,0.16)" />
          <polygon points="15,68 50,85 50,50" fill="rgba(255,255,255,0.1)" />
          <circle cx="38" cy="50" r="14" fill="#FFF" />
          <circle cx="62" cy="50" r="14" fill="#FFF" />
          <circle cx="33" cy="50" r="5" fill={INK} />
          <circle cx="57" cy="50" r="5" fill={INK} />
        </g>
      );
    case "hooked":
      return (
        <g>
          <defs>
            <linearGradient id="rHooked" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D9AA48" />
              <stop offset="50%" stopColor="#C4973A" />
              <stop offset="100%" stopColor="#9C7524" />
            </linearGradient>
          </defs>
          <path
            d="M 50 15 L 85 80 L 15 80 Z"
            fill="url(#rHooked)"
            stroke={accent}
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <polygon points="50,15 85,80 50,58" fill="rgba(255,255,255,0.24)" />
          <polygon points="50,15 15,80 50,58" fill="rgba(0,0,0,0.14)" />
          <path
            d="M 32 55 L 43 60 L 32 65 M 68 55 L 57 60 L 68 65"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <line
            x1="45"
            y1="75"
            x2="55"
            y2="75"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      );
    case "doom":
      return (
        <g>
          <defs>
            <linearGradient id="rDoom" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D86B50" />
              <stop offset="50%" stopColor="#C4563A" />
              <stop offset="100%" stopColor="#9E3B22" />
            </linearGradient>
          </defs>
          <rect x="15" y="20" width="70" height="65" rx="16" fill="url(#rDoom)" />
          <polygon points="15,20 85,20 50,52" fill="rgba(255,255,255,0.22)" />
          <polygon points="85,20 85,85 50,52" fill="rgba(0,0,0,0.12)" />
          <polygon points="15,85 85,85 50,52" fill="rgba(0,0,0,0.20)" />
          <line
            x1="28"
            y1="42"
            x2="72"
            y2="42"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="32"
            y1="50"
            x2="44"
            y2="50"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="56"
            y1="50"
            x2="68"
            y2="50"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="42"
            y1="68"
            x2="58"
            y2="68"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      );
  }
}

export function MoodFace({ score, size = 96 }: { score: number; size?: number }) {
  const st = stateFor(score);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-label={st.label.toLowerCase()}
      role="img"
    >
      <Face type={st.key} accent={st.accent} />
    </svg>
  );
}
