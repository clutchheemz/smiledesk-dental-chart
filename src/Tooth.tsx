import type { KeyboardEvent } from "react";
import {
  COLORS,
  FINDINGS,
  SURFACES,
  archPosition,
  isUpper,
  mesialIsLocalRight,
  toothKind,
  type Finding,
  type Language,
  type Surface,
  type ToothKind
} from "./model";
import { MESSAGES } from "./i18n";

interface Anatomy {
  crown: string;
  roots: string[];
  canals: string[];
  widthScale: number;
}

function anatomy(number: string): Anatomy {
  const kind = toothKind(number);
  const upper = isUpper(number);

  if (
    kind === "centralIncisor" ||
    kind === "lateralIncisor"
  ) {
    const lateral = kind === "lateralIncisor";

    return {
      crown: lateral
        ? "M-8-5 Q0-8 8-5 Q11 4 9 20 Q4 25-4 24 Q-10 24-10 18 Q-11 4-8-5Z"
        : "M-10-5 Q0-9 10-5 Q13 4 11 21 Q6 25 0 23 Q-6 25-11 21 Q-13 4-10-5Z",
      roots: [
        "M-7-4 C-8-17-6-29-2-39 Q0-45 3-40 C7-30 8-15 7-4Z"
      ],
      canals: [
        "M0 0 C0-12 1-25 1-36"
      ],
      widthScale: lateral ? 0.64 : 0.76
    };
  }

  if (kind === "canine") {
    return {
      crown:
        "M-9-5 Q0-9 9-5 Q13 3 10 15 Q6 23 0 29 Q-7 23-10 15 Q-13 3-9-5Z",
      roots: [
        "M-7-4 C-10-19-6-35-1-44 Q2-48 4-41 C6-29 9-15 7-4Z"
      ],
      canals: [
        "M0 5 C-1-13 1-28 1-40"
      ],
      widthScale: 0.7
    };
  }

  if (kind === "premolar") {
    return {
      crown:
        "M-12-5 Q-5-9 0-5 Q6-9 12-4 Q16 6 11 20 Q6 27 0 22 Q-7 27-12 20 Q-16 6-12-5Z",
      roots: upper
        ? [
            "M-10-4 C-12-15-11-31-6-39 Q-3-43-3-36 L-1-6Z",
            "M1-6 L4-35 Q5-43 8-36 C12-25 12-13 10-4Z"
          ]
        : [
            "M-9-4 C-10-16-7-31-2-40 Q1-44 4-37 C9-23 10-12 9-4Z"
          ],
      canals: upper
        ? [
            "M-5 2 Q-7-17-6-34",
            "M5 2 Q8-15 7-32"
          ]
        : [
            "M0 2 Q0-18 1-35"
          ],
      widthScale: 0.88
    };
  }

  return {
    crown:
      "M-14-5 Q-8-10-2-5 Q4-10 10-6 Q17-5 17 5 L15 17 Q12 25 6 22 Q1 27-4 22 Q-12 26-15 19 L-17 5 Q-18-3-14-5Z",
    roots: upper
      ? [
          "M-13-3 C-17-15-18-29-13-38 Q-10-43-8-35 L-5-5Z",
          "M-4-5 L-3-33 Q0-43 3-33 L5-5Z",
          "M5-5 L10-35 Q13-42 16-34 C19-24 16-13 13-3Z"
        ]
      : [
          "M-13-3 C-17-17-15-32-10-39 Q-7-43-5-34 L-2-4Z",
          "M2-4 L6-33 Q9-42 12-36 C17-24 15-13 13-3Z"
        ],
    canals: upper
      ? [
          "M-9 3 Q-13-15-12-33",
          "M0 3 L0-32",
          "M9 3 Q14-17 13-31"
        ]
      : [
          "M-8 3 Q-12-17-9-33",
          "M8 3 Q13-17 10-32"
        ],
    widthScale: 1
  };
}

const SURFACE_PATHS = {
  O: "M-4-4 H4 V4 H-4Z",
  B: "M-10-9 Q0-12 10-9 L4-4 H-4Z",
  L: "M-10 9 Q0 12 10 9 L4 4 H-4Z",
  left: "M-10-9 L-4-4 V4 L-10 9 Q-13 0-10-9Z",
  right: "M10-9 L4-4 V4 L10 9 Q13 0 10-9Z"
};

function surfacePath(
  surface: Surface,
  mesialRight: boolean
): string {
  if (surface === "M") {
    return mesialRight
      ? SURFACE_PATHS.right
      : SURFACE_PATHS.left;
  }

  if (surface === "D") {
    return mesialRight
      ? SURFACE_PATHS.left
      : SURFACE_PATHS.right;
  }

  return SURFACE_PATHS[surface];
}

interface ToothProps {
  number: string;
  index: number;
  count: number;
  upper: boolean;
  selected: boolean;
  findings: Finding[];
  language: Language;
  onSelect: () => void;
}

export function Tooth({
  number,
  index,
  count,
  upper,
  selected,
  findings,
  language,
  onSelect
}: ToothProps) {
  const t = MESSAGES[language];
  const position = archPosition(index, count, upper);
  const shape = anatomy(number);
  const kind: ToothKind = toothKind(number);
  const primary = Number(number[0]) >= 5;
  const rootScale = primary ? 0.87 : 1;

  // Structural visibility follows the latest structural observation.
  const structural = [...findings]
    .reverse()
    .find((finding) =>
      finding.kind === "missing" || finding.kind === "implant"
    );

  const missing = structural?.kind === "missing";
  const implant = structural?.kind === "implant";
  const crown = findings.some((finding) => finding.kind === "crown");
  const rootCanal = findings.some(
    (finding) => finding.kind === "rootCanal"
  );
  const extraction = findings.some(
    (finding) => finding.kind === "extraction"
  );

  const categories = FINDINGS.filter((category) =>
    findings.some((finding) => finding.kind === category)
  );

  const markedSurfaces = new Map<Surface, string>();

  for (const finding of findings) {
    if (finding.kind !== "caries" && finding.kind !== "filling") {
      continue;
    }

    for (const surface of finding.surfaces) {
      markedSurfaces.set(surface, COLORS[finding.kind]);
    }
  }

  function handleKey(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  const crownFill = missing
    ? "#f0f0ea"
    : crown
      ? COLORS.crown
      : "#fffef9";

  return (
    <g
      className={`tooth ${selected ? "is-selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${t.tooth} ${number}`}
      aria-pressed={selected}
      data-tooth={number}
      onClick={onSelect}
      onKeyDown={handleKey}
    >
      <title>
        {`${t.tooth} ${number} · ${t.toothKinds[kind]} · ${
          categories.length
            ? categories.map((category) => t.findings[category]).join("، ")
            : t.noFindings
        }`}
      </title>

      <g
        transform={`translate(${position.x} ${position.y}) rotate(${position.angle})`}
      >
        <rect
          className="tooth-hit"
          x="-20"
          y="-49"
          width="40"
          height="83"
          rx="9"
          fill="transparent"
        />

        <rect
          className="tooth-focus"
          x="-22"
          y="-50"
          width="44"
          height="86"
          rx="10"
          fill="none"
          stroke="#151713"
          strokeWidth="2"
          strokeDasharray="3 3"
        />

        {selected && (
          <g
            fill="#f3d868"
            stroke="#f3d868"
            strokeWidth="9"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <g transform={`scale(1 ${rootScale})`}>
              {shape.roots.map((path, rootIndex) => (
                <path key={rootIndex} d={path} />
              ))}
            </g>
            <path d={shape.crown} />
          </g>
        )}

        {!implant && (
          <g
            transform={`scale(1 ${rootScale})`}
            fill={missing ? "#f0f0ea" : "#eee9dd"}
            stroke={missing ? "#858a82" : "#262820"}
            strokeWidth="1.7"
            strokeLinejoin="round"
            strokeDasharray={missing ? "3 3" : undefined}
          >
            {shape.roots.map((path, rootIndex) => (
              <path key={rootIndex} d={path} />
            ))}
          </g>
        )}

        {implant && (
          <g
            fill={COLORS.implant}
            stroke="#263b35"
            strokeWidth="1.8"
            strokeLinejoin="round"
          >
            <path d="M-7-5 L-6-35 Q0-42 6-35 L7-5Z" />
            {[-10, -16, -22, -28, -34].map((y) => (
              <path key={y} d={`M-9 ${y + 2} L9 ${y - 2}`} />
            ))}
          </g>
        )}

        <path
          d={shape.crown}
          fill={crownFill}
          stroke={missing ? "#858a82" : "#262820"}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeDasharray={missing ? "3 3" : undefined}
        />

        {!missing && (
          <>
            {/* Minimal occlusal anatomy only where useful. */}
            {(kind === "molar" || kind === "premolar") && (
              <path
                d="M-9 8 Q-4 4 0 8 Q5 4 10 8 M0 8 Q-2 14 1 20"
                fill="none"
                stroke="#b5afa1"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            )}

            {crown && (
              <path
                d="M-11-1 Q0 3 11-1"
                fill="none"
                stroke="#806416"
                strokeWidth="1.4"
              />
            )}

            <g
              transform={`translate(0 11) scale(${shape.widthScale} .85)`}
              stroke="#38382f"
              strokeWidth=".85"
              strokeLinejoin="round"
            >
              {SURFACES.map((surface) => {
                const color = markedSurfaces.get(surface);

                return color ? (
                  <path
                    key={surface}
                    d={surfacePath(surface, mesialIsLocalRight(number))}
                    fill={color}
                  />
                ) : null;
              })}
            </g>

            {rootCanal && !implant && (
              <g
                transform={`scale(1 ${rootScale})`}
                fill="none"
                stroke={COLORS.rootCanal}
                strokeWidth="3"
                strokeLinecap="round"
              >
                {shape.canals.map((path, canalIndex) => (
                  <path key={canalIndex} d={path} />
                ))}
              </g>
            )}
          </>
        )}

        {missing && (
          <path
            d="M-8 2 L8 18 M8 2 L-8 18"
            stroke="#858a82"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}

        {extraction && (
          <g strokeLinecap="round">
            <path
              d="M-15-14 L15 24 M15-14 L-15 24"
              stroke="#fffef9"
              strokeWidth="6"
            />
            <path
              d="M-15-14 L15 24 M15-14 L-15 24"
              stroke="#b65327"
              strokeWidth="3.3"
            />
          </g>
        )}
      </g>

      <g
        transform={`translate(${position.labelX} ${position.labelY})`}
        className="tooth-label"
        aria-hidden="true"
      >
        <rect
          x="-16"
          y="-13"
          width="32"
          height="25"
          rx="2"
          fill={selected ? "#171913" : "transparent"}
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill={selected ? "#fffef9" : "#22251e"}
        >
          {number}
        </text>

        {categories.map((category, categoryIndex) => (
          <circle
            key={category}
            cx={(categoryIndex - (categories.length - 1) / 2) * 4.8}
            cy="18"
            r="2.1"
            fill={COLORS[category]}
            stroke="#30342b"
            strokeWidth=".5"
          />
        ))}
      </g>
    </g>
  );
}