import { describe, expect, it } from "vitest";
import {
  CARIES_CLASSES,
  FDI,
  FINDINGS,
  SURFACES,
  archPosition,
  chartReducer,
  createHistory,
  emptyChart,
  mesialIsLocalRight,
  toothKind,
  type Dentition,
  type Finding,
  type FindingKind
} from "../src/model";

function add(
  state: ReturnType<typeof createHistory>,
  kind: FindingKind,
  dentition: Dentition = "permanent",
  tooth = dentition === "permanent" ? "11" : "51",
  overrides: Partial<Finding> = {}
) {
  return chartReducer(state, {
    type: "add",
    dentition,
    tooth,
    finding: {
      id: `${dentition}-${tooth}-${kind}-${state.past.length}`,
      kind,
      surfaces: [...SURFACES],
      note: "  Clinical note  ",
      ...(kind === "caries" ? { cariesClass: "I" as const } : {}),
      ...overrides
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
  it("exports classes I-V and retains the existing findings and legacy surfaces", () => {
    expect(CARIES_CLASSES).toEqual(["I", "II", "III", "IV", "V"]);
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

  it("rejects tooth numbers from the wrong dentition", () => {
    const state = createHistory();
    expect(add(state, "crown", "primary", "11")).toBe(state);
    expect(add(state, "crown", "permanent", "51")).toBe(state);
    expect(add(state, "caries", "permanent", "99")).toBe(state);
    expect(state.past).toEqual([]);
  });

  it("keeps an empty history unchanged on undo and reset", () => {
    const state = createHistory();
    expect(state.value).toEqual({ version: 1, permanent: {}, primary: {} });
    expect(chartReducer(state, { type: "undo" })).toBe(state);
    for (const dentition of ["permanent", "primary"] as const) {
      expect(chartReducer(state, { type: "reset", dentition })).toBe(state);
    }
  });
});

describe.each(["permanent", "primary"] as const)("%s findings", (dentition) => {
  const tooth = dentition === "permanent" ? "11" : "51";
  const otherTooth = dentition === "permanent" ? "12" : "52";
  const otherDentition = dentition === "permanent" ? "primary" : "permanent";
  const otherDentitionTooth = dentition === "permanent" ? "51" : "11";

  it.each(CARIES_CLASSES)("adds class %s with normalized surfaces and a trimmed 160-character note", (cariesClass) => {
    const state = createHistory();
    const next = add(state, "caries", dentition, tooth, {
      id: "caries",
      cariesClass,
      note: ` \n${"a".repeat(200)}\t `
    });

    expect(next.value[dentition][tooth]).toEqual([{
      id: "caries",
      kind: "caries",
      cariesClass,
      surfaces: [],
      note: "a".repeat(160)
    }]);
    expect(next.value.version).toBe(1);
    expect(next.value[otherDentition]).toBe(state.value[otherDentition]);
    expect(next.past).toEqual([{ value: state.value, dentition }]);
    expect(state.value).toEqual(emptyChart());
  });

  it("accepts new caries without any selected surfaces", () => {
    const state = add(createHistory(), "caries", dentition, tooth, {
      surfaces: []
    });
    expect(state.value[dentition][tooth][0].surfaces).toEqual([]);
    expect(state.past).toHaveLength(1);
  });

  it("rejects a new caries finding with no class property", () => {
    const state = add(createHistory(), "crown", dentition, tooth);
    expect(chartReducer(state, {
      type: "add",
      dentition,
      tooth,
      finding: { id: "unclassified", kind: "caries", surfaces: ["O"], note: "" }
    })).toBe(state);
    expect(state.past).toHaveLength(1);
  });

  it.each([undefined, null, "", "VI", "i", " I ", 1])("rejects invalid class %j without history", (cariesClass) => {
    const state = add(createHistory(), "crown", dentition, tooth);
    expect(add(state, "caries", dentition, tooth, {
      cariesClass: cariesClass as Finding["cariesClass"]
    })).toBe(state);
    expect(state.past).toHaveLength(1);
  });

  it.each(CARIES_CLASSES)("rejects duplicate class %s on the same tooth without history", (cariesClass) => {
    const state = add(createHistory(), "caries", dentition, tooth, {
      id: "original",
      cariesClass
    });
    expect(add(state, "caries", dentition, tooth, {
      id: "different-id",
      cariesClass,
      surfaces: [],
      note: "A different note"
    })).toBe(state);
    expect(state.value[dentition][tooth][0].note).toBe("Clinical note");
    expect(state.past).toHaveLength(1);
  });

  it("allows all five distinct classes to coexist on one tooth", () => {
    let state = createHistory();
    for (const cariesClass of CARIES_CLASSES) {
      state = add(state, "caries", dentition, tooth, { cariesClass });
    }
    expect(state.value[dentition][tooth].map((finding) => finding.cariesClass))
      .toEqual(CARIES_CLASSES);
    expect(state.past).toHaveLength(5);
  });

  it.each(FINDINGS.filter((kind) => kind !== "caries"))("adds %s at tooth level and strips cariesClass", (kind) => {
    for (const surfaces of [[], [...SURFACES]]) {
      const state = add(createHistory(), kind, dentition, tooth, {
        surfaces,
        cariesClass: "V"
      });
      expect(state.value[dentition][tooth][0]).toEqual({
        id: `${dentition}-${tooth}-${kind}-0`,
        kind,
        surfaces: [],
        note: "Clinical note"
      });
      expect(state.value[dentition][tooth][0]).not.toHaveProperty("cariesClass");
      expect(state.past).toHaveLength(1);
    }
  });

  it.each(FINDINGS.filter((kind) => kind !== "caries"))("rejects duplicate %s even after an unrelated finding", (kind) => {
    let state = add(createHistory(), kind, dentition, tooth);
    state = add(state, "caries", dentition, tooth);
    expect(add(state, kind, dentition, tooth)).toBe(state);
    expect(state.past).toHaveLength(2);
  });

  it.each(["missing", "implant"] as const)("allows re-adding %s when the latest structural finding differs", (kind) => {
    const otherKind = kind === "missing" ? "implant" : "missing";
    let state = add(createHistory(), kind, dentition, tooth);
    state = add(state, otherKind, dentition, tooth);
    state = add(state, "crown", dentition, tooth);
    const next = add(state, kind, dentition, tooth);

    expect(next.value[dentition][tooth].map((finding) => finding.kind))
      .toEqual([kind, otherKind, "crown", kind]);
    expect(next.past).toHaveLength(state.past.length + 1);
    expect(add(next, kind, dentition, tooth)).toBe(next);
    expect(chartReducer(next, { type: "undo" }).value).toBe(state.value);
  });

  it("allows the same class and noncaries kind on other teeth and dentitions", () => {
    let state = createHistory();
    for (const [targetDentition, targetTooth] of [
      [dentition, tooth],
      [dentition, otherTooth],
      [otherDentition, otherDentitionTooth]
    ] as const) {
      state = add(state, "caries", targetDentition, targetTooth, { cariesClass: "III" });
      state = add(state, "filling", targetDentition, targetTooth);
      expect(state.value[targetDentition][targetTooth]).toHaveLength(2);
    }
    expect(state.past).toHaveLength(6);
  });

  it.each(["unknown", "", "Caries", "toString", undefined, null])("rejects unsupported kind %j without history", (kind) => {
    const state = add(createHistory(), "caries", dentition, tooth);
    expect(add(state, kind as FindingKind, dentition, tooth)).toBe(state);
    expect(state.past).toHaveLength(1);
  });

  it("rejects duplicate IDs anywhere in the chart without history", () => {
    const state = add(createHistory(), "caries", dentition, tooth, { id: "shared-id" });
    for (const [targetDentition, targetTooth] of [
      [dentition, tooth],
      [dentition, otherTooth],
      [otherDentition, otherDentitionTooth]
    ] as const) {
      for (const kind of ["caries", "crown"] as const) {
        expect(add(state, kind, targetDentition, targetTooth, {
          id: "shared-id",
          cariesClass: "II"
        })).toBe(state);
      }
    }
    expect(state.past).toHaveLength(1);
  });

  it("edits only the requested finding immutably and undoes the edit once", () => {
    let state = add(createHistory(), "filling", dentition, tooth);
    state = add(state, "caries", dentition, tooth, { id: "target", cariesClass: "IV" });
    state = add(state, "crown", dentition, otherTooth);
    state = add(state, "implant", otherDentition, otherDentitionTooth);
    const snapshot = structuredClone(state);
    const action = { type: "note", dentition, tooth, id: "target", note: "  Updated note \n" } as const;
    const next = chartReducer(state, action);

    expect(state).toEqual(snapshot);
    expect(next.value).not.toBe(state.value);
    expect(next.value[dentition]).not.toBe(state.value[dentition]);
    expect(next.value[dentition][tooth]).not.toBe(state.value[dentition][tooth]);
    expect(next.value[dentition][tooth][0]).toBe(state.value[dentition][tooth][0]);
    expect(next.value[dentition][tooth][1]).toEqual({
      ...state.value[dentition][tooth][1],
      note: "Updated note"
    });
    expect(next.value[dentition][otherTooth]).toBe(state.value[dentition][otherTooth]);
    expect(next.value[otherDentition]).toBe(state.value[otherDentition]);
    expect(next.past).toHaveLength(state.past.length + 1);
    expect(next.past.at(-1)).toEqual({ value: state.value, dentition });
    expect(chartReducer(next, action)).toBe(next);
    const undone = chartReducer(next, { type: "undo" });
    expect(undone.value).toBe(state.value);
    expect(undone.past).toEqual(state.past);
  });

  it("trims, truncates and clears edited notes with normalized no-ops", () => {
    const state = add(createHistory(), "crown", dentition, tooth, { id: "target" });
    for (const [note, expected] of [
      [` \n${"x".repeat(200)}\t `, "x".repeat(160)],
      ["  Short note  ", "Short note"],
      [" \n\t ", ""]
    ]) {
      const action = { type: "note", dentition, tooth, id: "target", note } as const;
      const next = chartReducer(state, action);
      expect(next.value[dentition][tooth][0].note).toBe(expected);
      expect(next.past).toHaveLength(state.past.length + 1);
      expect(chartReducer(next, action)).toBe(next);
      expect(chartReducer(next, { type: "undo" }).value).toBe(state.value);
    }
  });

  it("does not add history for unchanged notes or invalid note/remove targets", () => {
    const state = add(createHistory(), "caries", dentition, tooth, { id: "target" });
    expect(chartReducer(state, {
      type: "note", dentition, tooth, id: "target", note: " \nClinical note\t "
    })).toBe(state);
    for (const target of [
      { dentition, tooth, id: "unknown" },
      { dentition, tooth, id: "" },
      { dentition, tooth: otherTooth, id: "target" },
      { dentition, tooth: otherDentitionTooth, id: "target" },
      { dentition: otherDentition, tooth: otherDentitionTooth, id: "target" }
    ] as const) {
      expect(chartReducer(state, { type: "note", ...target, note: "Changed" })).toBe(state);
      expect(chartReducer(state, { type: "remove", ...target })).toBe(state);
    }
    expect(state.past).toHaveLength(1);
  });

  it("preserves both dentitions through add, remove, reset and ordered undo", () => {
    const initial = createHistory();
    const other = add(initial, "caries", otherDentition, otherDentitionTooth);
    const first = add(other, "caries", dentition, tooth, { id: "first", cariesClass: "II" });
    const second = add(first, "caries", dentition, tooth, { id: "second", cariesClass: "V" });
    const beforeRemove = structuredClone(second);
    const removed = chartReducer(second, {
      type: "remove", dentition, tooth, id: "first"
    });

    expect(second).toEqual(beforeRemove);
    expect(removed.value[dentition][tooth]).toEqual([second.value[dentition][tooth][1]]);
    expect(removed.value[otherDentition]).toBe(other.value[otherDentition]);
    expect(removed.past).toHaveLength(second.past.length + 1);
    const removedLast = chartReducer(removed, {
      type: "remove", dentition, tooth, id: "second"
    });
    expect(removedLast.value[dentition]).not.toHaveProperty(tooth);
    expect(chartReducer(removedLast, { type: "undo" }).value).toBe(removed.value);
    expect(chartReducer(removedLast, { type: "reset", dentition })).toBe(removedLast);

    const reset = chartReducer(removed, { type: "reset", dentition });
    expect(reset.value[dentition]).toEqual({});
    expect(reset.value[otherDentition]).toBe(other.value[otherDentition]);
    expect(removed.value[dentition][tooth]).toHaveLength(1);
    expect(reset.past).toHaveLength(removed.past.length + 1);
    expect(chartReducer(reset, { type: "reset", dentition })).toBe(reset);

    let undone = reset;
    for (const previous of [removed, second, first, other, initial]) {
      undone = chartReducer(undone, { type: "undo" });
      expect(undone.value).toBe(previous.value);
      expect(undone.past).toEqual(previous.past);
    }
    expect(chartReducer(undone, { type: "undo" })).toBe(undone);
    expect(add(removed, "caries", dentition, tooth, { id: "first", cariesClass: "II" })
      .value[dentition][tooth]).toHaveLength(2);
  });
});

describe("legacy snapshots and ownership", () => {
  it("deep-clones version 1 snapshots without inferring classes or normalizing existing data", () => {
    const initial = emptyChart();
    initial.permanent["11"] = [
      { id: "legacy-caries", kind: "caries", surfaces: ["D", "M", "D"], note: `  ${"x".repeat(200)}  ` },
      { id: "legacy-filling", kind: "filling", surfaces: ["B", "L"], note: "  Filling note  " },
      { id: "legacy-crown", kind: "crown", surfaces: ["O"], note: "Crown", cariesClass: "V" }
    ];
    initial.primary["51"] = [
      { id: "primary-caries", kind: "caries", surfaces: ["M"], note: "  Primary note  " },
      { id: "classified", kind: "caries", surfaces: ["O"], note: "Classified", cariesClass: "II" }
    ];
    const snapshot = structuredClone(initial);
    const state = createHistory(initial);

    expect(state.value).toEqual(snapshot);
    expect(state.value).not.toBe(initial);
    expect(state.past).toEqual([]);
    for (const dentition of ["permanent", "primary"] as const) {
      expect(state.value[dentition]).not.toBe(initial[dentition]);
      for (const [tooth, findings] of Object.entries(initial[dentition])) {
        expect(state.value[dentition][tooth]).not.toBe(findings);
        findings.forEach((finding, index) => {
          expect(state.value[dentition][tooth][index]).not.toBe(finding);
          expect(state.value[dentition][tooth][index].surfaces).not.toBe(finding.surfaces);
        });
      }
    }
    expect(state.value.permanent["11"][0]).not.toHaveProperty("cariesClass");
    expect(state.value.primary["51"][0]).not.toHaveProperty("cariesClass");
    initial.permanent["11"][0].surfaces.push("B");
    initial.permanent["11"][0].note = "Caller changed";
    expect(state.value).toEqual(snapshot);
    state.value.primary["51"][0].surfaces.push("L");
    state.value.primary["51"][0].note = "Owned value changed";
    expect(initial.primary).toEqual(snapshot.primary);
  });

  it.each(["permanent", "primary"] as const)("retains unclassified %s caries on add and note edit/undo", (dentition) => {
    const tooth = dentition === "permanent" ? "11" : "51";
    const initial = emptyChart();
    initial[dentition][tooth] = [{
      id: "legacy", kind: "caries", surfaces: ["M", "D"], note: `  ${"x".repeat(200)}  `
    }];
    const state = createHistory(initial);
    const added = add(state, "caries", dentition, tooth);
    expect(added.value[dentition][tooth]).toHaveLength(2);
    expect(added.value[dentition][tooth][0]).toEqual(initial[dentition][tooth][0]);
    expect(add(added, "caries", dentition, tooth)).toBe(added);
    const edited = chartReducer(added, {
      type: "note", dentition, tooth, id: "legacy", note: "  Reviewed  "
    });
    expect(edited.value[dentition][tooth][0]).toEqual({
      ...initial[dentition][tooth][0], note: "Reviewed"
    });
    expect(edited.value[dentition][tooth][0]).not.toHaveProperty("cariesClass");
    expect(chartReducer(edited, { type: "undo" }).value).toBe(added.value);
    expect(chartReducer(added, { type: "undo" }).value).toEqual(initial);
  });

  it("does not mutate frozen state, caller data or add payloads", () => {
    const initial = emptyChart();
    initial.permanent["11"] = [{ id: "legacy", kind: "filling", surfaces: ["M"], note: "  Kept  " }];
    initial.primary["51"] = [{ id: "other", kind: "crown", surfaces: [], note: "Other" }];
    const state = createHistory(initial);
    const snapshot = structuredClone(state);
    for (const dentition of ["permanent", "primary"] as const) {
      for (const findings of Object.values(state.value[dentition])) {
        for (const finding of findings) {
          Object.freeze(finding.surfaces);
          Object.freeze(finding);
        }
        Object.freeze(findings);
      }
      Object.freeze(state.value[dentition]);
    }
    Object.freeze(state.value);
    Object.freeze(state.past);
    Object.freeze(state);
    const finding: Finding = {
      id: "new", kind: "caries", cariesClass: "III", surfaces: ["B", "D"], note: "  New note  "
    };
    Object.freeze(finding.surfaces);
    Object.freeze(finding);
    const next = chartReducer(state, { type: "add", dentition: "permanent", tooth: "11", finding });

    expect(state).toEqual(snapshot);
    expect(initial).toEqual(snapshot.value);
    expect(next.value.permanent["11"][0]).toBe(state.value.permanent["11"][0]);
    expect(next.value.primary).toBe(state.value.primary);
    expect(next.value.permanent["11"][1]).not.toBe(finding);
    expect(next.value.permanent["11"][1].surfaces).not.toBe(finding.surfaces);
    expect(finding.surfaces).toEqual(["B", "D"]);
    expect(finding.note).toBe("  New note  ");
    expect(chartReducer(state, {
      type: "note", dentition: "permanent", tooth: "11", id: "legacy", note: "Edited"
    }).value.permanent["11"][0].surfaces).toEqual(["M"]);
    expect(chartReducer(state, {
      type: "remove", dentition: "permanent", tooth: "11", id: "legacy"
    }).value.permanent).toEqual({});
    expect(chartReducer(state, { type: "reset", dentition: "primary" }).value.primary).toEqual({});
    expect(state).toEqual(snapshot);
  });
});
