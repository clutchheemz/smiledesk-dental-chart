import { describe, expect, it } from "vitest";
import {
  FDI,
  FINDINGS,
  SURFACES,
  archPosition,
  chartReducer,
  createHistory,
  emptyChart,
  mesialIsLocalRight,
  toothKind,
  usesSurfaces,
  type Dentition,
  type FindingKind
} from "../src/model";

function add(
  state: ReturnType<typeof createHistory>,
  kind: FindingKind,
  dentition: Dentition = "permanent",
  tooth = "11"
) {
  return chartReducer(state, {
    type: "add",
    dentition,
    tooth,
    finding: {
      id: `${dentition}-${kind}`,
      kind,
      surfaces: [...SURFACES],
      note: "  Clinical note  "
    }
  });
}

describe("FDI and anatomy", () => {
  it("contains the exact permanent arches", () => {
    expect(FDI.permanent.upper.join(" ")).toBe(
      "18 17 16 15 14 13 12 11 21 22 23 24 25 26 27 28"
    );
    expect(FDI.permanent.lower.join(" ")).toBe(
      "48 47 46 45 44 43 42 41 31 32 33 34 35 36 37 38"
    );
  });

  it("contains the exact primary arches", () => {
    expect(FDI.primary.upper.join(" ")).toBe(
      "55 54 53 52 51 61 62 63 64 65"
    );
    expect(FDI.primary.lower.join(" ")).toBe(
      "85 84 83 82 81 71 72 73 74 75"
    );
  });

  it("has 32 unique permanent and 20 unique primary teeth", () => {
    expect(
      new Set([...FDI.permanent.upper, ...FDI.permanent.lower]).size
    ).toBe(32);

    expect(
      new Set([...FDI.primary.upper, ...FDI.primary.lower]).size
    ).toBe(20);
  });

  it("classifies permanent and primary tooth types correctly", () => {
    expect(toothKind("11")).toBe("centralIncisor");
    expect(toothKind("12")).toBe("lateralIncisor");
    expect(toothKind("13")).toBe("canine");
    expect(toothKind("14")).toBe("premolar");
    expect(toothKind("15")).toBe("premolar");
    expect(toothKind("16")).toBe("molar");
    expect(toothKind("18")).toBe("molar");

    expect(toothKind("51")).toBe("centralIncisor");
    expect(toothKind("52")).toBe("lateralIncisor");
    expect(toothKind("53")).toBe("canine");
    expect(toothKind("54")).toBe("molar");
    expect(toothKind("55")).toBe("molar");
  });

  it("uses the correct mesial direction after tooth rotation", () => {
    for (const number of ["11", "31", "51", "71"]) {
      expect(mesialIsLocalRight(number)).toBe(true);
    }
    for (const number of ["21", "41", "61", "81"]) {
      expect(mesialIsLocalRight(number)).toBe(false);
    }
  });

  it("positions both dentitions in curved, ordered arches", () => {
    for (const dentition of ["permanent", "primary"] as const) {
      for (const arch of ["upper", "lower"] as const) {
        const count = FDI[dentition][arch].length;
        const upper = arch === "upper";

        const points = Array.from({ length: count }, (_, index) =>
          archPosition(index, count, upper)
        );

        for (let index = 1; index < count; index++) {
          expect(points[index].x).toBeGreaterThan(points[index - 1].x);
          expect(
            Math.hypot(
              points[index].x - points[index - 1].x,
              points[index].y - points[index - 1].y
            )
          ).toBeGreaterThan(38);
        }

        const middle = points[count / 2];

        if (upper) {
          expect(middle.y).toBeLessThan(points[0].y);
          expect(points[0].angle).toBeLessThan(0);
          expect(points.at(-1)!.angle).toBeGreaterThan(0);
        } else {
          expect(middle.y).toBeGreaterThan(points[0].y);
          expect(points[0].angle).toBeGreaterThan(180);
          expect(points.at(-1)!.angle).toBeLessThan(180);
        }

        for (const point of points) {
          expect(point.labelX).toBeGreaterThan(15);
          expect(point.labelX).toBeLessThan(885);
          expect(point.labelY).toBeGreaterThan(15);
          expect(point.labelY).toBeLessThan(725);
        }
      }
    }
  });
});

describe("clinical state", () => {
  it("supports exactly the requested findings and surfaces", () => {
    expect(FINDINGS).toEqual([
      "caries",
      "filling",
      "crown",
      "rootCanal",
      "implant",
      "missing",
      "extraction"
    ]);

    expect(SURFACES).toEqual(["O", "M", "D", "B", "L"]);
  });

  it("records every finding and normalizes its scope and note", () => {
    let state = createHistory();

    for (const kind of FINDINGS) {
      state = add(state, kind);
    }

    expect(state.value.permanent["11"]).toHaveLength(7);

    for (const finding of state.value.permanent["11"]) {
      expect(finding.surfaces).toEqual(
        usesSurfaces(finding.kind) ? SURFACES : []
      );
      expect(finding.note).toBe("Clinical note");
    }
  });

  it("requires surfaces only for caries and restorations", () => {
    const state = createHistory();

    for (const kind of ["caries", "filling"] as const) {
      const next = chartReducer(state, {
        type: "add",
        dentition: "permanent",
        tooth: "11",
        finding: { id: kind, kind, surfaces: [], note: "" }
      });

      expect(next).toBe(state);
    }

    expect(add(state, "crown").value.permanent["11"][0].surfaces)
      .toEqual([]);
  });

  it("rejects tooth numbers from the wrong dentition", () => {
    const state = createHistory();
    expect(add(state, "crown", "primary", "11")).toBe(state);
    expect(add(state, "crown", "permanent", "51")).toBe(state);
  });

  it("preserves the other dentition during reset and supports undo", () => {
    let state = add(createHistory(), "caries");
    state = add(state, "crown", "primary", "51");

    const beforeReset = state.value;

    state = chartReducer(state, {
      type: "reset",
      dentition: "primary"
    });

    expect(state.value.primary).toEqual({});
    expect(state.value.permanent["11"]).toHaveLength(1);

    state = chartReducer(state, { type: "undo" });
    expect(state.value).toEqual(beforeReset);

    state = chartReducer(state, {
      type: "remove",
      dentition: "primary",
      tooth: "51",
      id: "primary-crown"
    });

    expect(state.value.primary["51"]).toBeUndefined();

    state = chartReducer(state, { type: "undo" });
    expect(state.value.primary["51"][0].note).toBe("Clinical note");
  });

  it("does not mutate initial values and limits notes", () => {
    const initial = emptyChart();
    let state = createHistory(initial);

    state = chartReducer(state, {
      type: "add",
      dentition: "permanent",
      tooth: "11",
      finding: {
        id: "long-note",
        kind: "crown",
        surfaces: [],
        note: "a".repeat(200)
      }
    });

    expect(initial).toEqual(emptyChart());
    expect(state.value.permanent["11"][0].note).toHaveLength(160);
  });
});