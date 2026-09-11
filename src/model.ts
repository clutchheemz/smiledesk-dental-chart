export type Language = "ar" | "en";
export type Dentition = "permanent" | "primary";
export type Surface = "O" | "M" | "D" | "B" | "L";

export const CARIES_CLASSES = ["I", "II", "III", "IV", "V"] as const;
export type CariesClass = (typeof CARIES_CLASSES)[number];

export type FindingKind =
  | "caries"
  | "filling"
  | "crown"
  | "rootCanal"
  | "implant"
  | "missing"
  | "extraction";

export interface Finding {
  id: string;
  kind: FindingKind;
  /** Retained for imported snapshots; all new findings use an empty array. */
  surfaces: Surface[];
  note: string;
  /** Absent on non-caries findings and imported, unclassified caries. */
  cariesClass?: CariesClass;
}

export interface ChartValue {
  version: 1;
  permanent: Record<string, Finding[]>;
  primary: Record<string, Finding[]>;
}

export const SURFACES: readonly Surface[] = ["O", "M", "D", "B", "L"];

export const FINDINGS: readonly FindingKind[] = [
  "caries",
  "filling",
  "crown",
  "rootCanal",
  "implant",
  "missing",
  "extraction"
];

export const COLORS: Record<FindingKind, string> = {
  caries: "#e87568",
  filling: "#88b8e6",
  crown: "#e7c454",
  rootCanal: "#b09ad5",
  implant: "#71b6a9",
  missing: "#b8bcb5",
  extraction: "#ed9c65"
};

export const FDI: Record<
  Dentition,
  { upper: readonly string[]; lower: readonly string[] }
> = {
  permanent: {
    upper: [
      "18", "17", "16", "15", "14", "13", "12", "11",
      "21", "22", "23", "24", "25", "26", "27", "28"
    ],
    lower: [
      "48", "47", "46", "45", "44", "43", "42", "41",
      "31", "32", "33", "34", "35", "36", "37", "38"
    ]
  },
  primary: {
    upper: [
      "55", "54", "53", "52", "51",
      "61", "62", "63", "64", "65"
    ],
    lower: [
      "85", "84", "83", "82", "81",
      "71", "72", "73", "74", "75"
    ]
  }
};

export type ToothKind =
  | "centralIncisor"
  | "lateralIncisor"
  | "canine"
  | "premolar"
  | "molar";

export function toothKind(number: string): ToothKind {
  const quadrant = Number(number[0]);
  const position = Number(number[1]);

  if (position === 1) return "centralIncisor";
  if (position === 2) return "lateralIncisor";
  if (position === 3) return "canine";
  if (quadrant >= 5) return "molar";
  if (position <= 5) return "premolar";
  return "molar";
}

export function isUpper(number: string): boolean {
  return [1, 2, 5, 6].includes(Number(number[0]));
}

export function isPatientRight(number: string): boolean {
  return [1, 4, 5, 8].includes(Number(number[0]));
}

/**
 * Direction of the mesial surface in a tooth's LOCAL coordinate system.
 * Lower teeth rotate in the opposite direction from upper teeth.
 */
export function mesialIsLocalRight(number: string): boolean {
  return [1, 3, 5, 7].includes(Number(number[0]));
}

export function usesSurfaces(kind: FindingKind): boolean {
  return kind === "caries" || kind === "filling";
}

export function emptyChart(): ChartValue {
  return {
    version: 1,
    permanent: {},
    primary: {}
  };
}

export function validTooth(
  dentition: Dentition,
  number: string
): boolean {
  return (
    FDI[dentition].upper.includes(number) ||
    FDI[dentition].lower.includes(number)
  );
}

export function countFindings(
  value: ChartValue,
  dentition: Dentition
): number {
  return Object.values(value[dentition]).reduce(
    (total, findings) => total + findings.length,
    0
  );
}

export interface ArchPosition {
  x: number;
  y: number;
  angle: number;
  labelX: number;
  labelY: number;
}

/**
 * Anatomical order never changes with UI direction.
 *
 * Upper arch: anterior crowns point down/inward.
 * Lower arch: anterior crowns point up/inward.
 * Posterior teeth rotate naturally toward the arch center.
 */
export function archPosition(
  index: number,
  count: number,
  upper: boolean
): ArchPosition {
  const t = -1.38 + (index / (count - 1)) * 2.76;
  const x = 450 + 340 * Math.sin(t);
  const y = upper
    ? 315 - 208 * Math.cos(t)
    : 415 + 208 * Math.cos(t);

  const angle = upper
    ? (t * 180) / Math.PI
    : 180 - (t * 180) / Math.PI;

  const radians = (angle * Math.PI) / 180;

  return {
    x,
    y,
    angle,
    labelX: x + Math.sin(radians) * 62,
    labelY: y - Math.cos(radians) * 62
  };
}

interface HistoryEntry {
  value: ChartValue;
  dentition: Dentition;
}

export interface ChartHistory {
  value: ChartValue;
  past: HistoryEntry[];
}

export type ChartAction =
  | {
      type: "add";
      dentition: Dentition;
      tooth: string;
      finding: Finding;
    }
  | {
      type: "remove";
      dentition: Dentition;
      tooth: string;
      id: string;
    }
  | {
      type: "note";
      dentition: Dentition;
      tooth: string;
      id: string;
      note: string;
    }
  | {
      type: "reset";
      dentition: Dentition;
    }
  | {
      type: "undo";
    };

export function createHistory(
  initialValue?: ChartValue
): ChartHistory {
  // Own the data without mutating a caller's initialValue.
  const value = initialValue
    ? structuredClone(initialValue)
    : emptyChart();

  return { value, past: [] };
}

function commit(
  state: ChartHistory,
  value: ChartValue,
  dentition: Dentition
): ChartHistory {
  return {
    value,
    past: [...state.past, { value: state.value, dentition }]
  };
}

export function chartReducer(
  state: ChartHistory,
  action: ChartAction
): ChartHistory {
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;

    return {
      value: previous.value,
      past: state.past.slice(0, -1)
    };
  }

  const { dentition } = action;

  if (action.type === "reset") {
    if (countFindings(state.value, dentition) === 0) return state;

    return commit(
      state,
      { ...state.value, [dentition]: {} },
      dentition
    );
  }

  if (!validTooth(dentition, action.tooth)) return state;

  const previous = state.value[dentition][action.tooth] ?? [];

  if (action.type === "add") {
    const { id, kind, cariesClass } = action.finding;

    if (!FINDINGS.includes(kind)) return state;

    if (
      [state.value.permanent, state.value.primary].some((teeth) =>
        Object.values(teeth).some((findings) =>
          findings.some((finding) => finding.id === id)
        )
      )
    ) {
      return state;
    }

    if (kind === "caries") {
      if (
        !cariesClass ||
        !CARIES_CLASSES.includes(cariesClass) ||
        previous.some((finding) =>
          finding.kind === "caries" && finding.cariesClass === cariesClass
        )
      ) {
        return state;
      }
    } else if (kind === "missing" || kind === "implant") {
      // Alternating structural findings must be able to change visibility.
      const latestStructural = previous.filter((finding) =>
        finding.kind === "missing" || finding.kind === "implant"
      ).at(-1);
      if (latestStructural?.kind === kind) return state;
    } else if (previous.some((finding) => finding.kind === kind)) {
      return state;
    }

    const finding: Finding = {
      id,
      kind,
      surfaces: [],
      note: action.finding.note.trim().slice(0, 160)
    };

    if (kind === "caries") finding.cariesClass = cariesClass;

    return commit(
      state,
      {
        ...state.value,
        [dentition]: {
          ...state.value[dentition],
          [action.tooth]: [...previous, finding]
        }
      },
      dentition
    );
  }

  if (action.type === "note") {
    const index = previous.findIndex((finding) => finding.id === action.id);
    const note = action.note.trim().slice(0, 160);

    if (index === -1 || previous[index].note === note) return state;

    return commit(
      state,
      {
        ...state.value,
        [dentition]: {
          ...state.value[dentition],
          [action.tooth]: previous.map((finding, findingIndex) =>
            findingIndex === index ? { ...finding, note } : finding
          )
        }
      },
      dentition
    );
  }

  const remaining = previous.filter(
    (finding) => finding.id !== action.id
  );

  if (remaining.length === previous.length) return state;

  const nextDentition = { ...state.value[dentition] };

  if (remaining.length) {
    nextDentition[action.tooth] = remaining;
  } else {
    delete nextDentition[action.tooth];
  }

  return commit(
    state,
    { ...state.value, [dentition]: nextDentition },
    dentition
  );
}
