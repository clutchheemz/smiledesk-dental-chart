import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DentalChart } from "../src/DentalChart";
import {
  CARIES_CLASSES, COLORS, FDI, FINDINGS, emptyChart,
  type ChartValue, type Dentition, type Language
} from "../src/model";
import { MESSAGES } from "../src/i18n";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function tooth(number: string, language: Language = "en") {
  return screen.getByRole("button", { name: `${MESSAGES[language].tooth} ${number}` });
}

function currentFindings(language: Language = "en") {
  const name = MESSAGES[language].currentFindings;
  return within(screen.getByRole("complementary", { name })).getByRole("region", { name });
}

function record(label: string, language: Language = "en") {
  return within(currentFindings(language)).getByRole("button", {
    name: `${MESSAGES[language].remove}: ${label}`
  }).closest("li")!;
}

function expectTeeth(dentition: Dentition) {
  const numbers = Array.from(document.querySelectorAll<SVGGElement>("[data-tooth]"))
    .map((element) => element.dataset.tooth);
  expect(numbers).toEqual([...FDI[dentition].upper, ...FDI[dentition].lower]);
  expect(numbers).toHaveLength(dentition === "permanent" ? 32 : 20);
  expect(new Set(numbers).size).toBe(numbers.length);
  expect(document.querySelectorAll("svg.sd-arch")).toHaveLength(1);
}

function expectNoObsoleteControls() {
  expect(screen.queryByRole("button", { name: /apply/i, hidden: true })).toBeNull();
  expect(screen.queryByRole("group", { name: /surfaces/i, hidden: true })).toBeNull();
  expect(screen.queryAllByRole("button", {
    name: /^(?:M|O|D|B|L)(?:$|[\s:])/, hidden: true
  })).toHaveLength(0);
}

describe("DentalChart instant findings", () => {
  it("starts without a selected tooth or enabled finding actions, without matchMedia", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    expect(window.matchMedia).toBeUndefined();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);

    const actions = screen.getByRole("region", { name: "Select a tooth" });
    const classes = within(actions).getByRole("group", { name: "Caries classes" }) as HTMLFieldSetElement;
    expect(classes.disabled).toBe(true);
    expect(within(classes).getAllByRole("button").map((button) => button.getAttribute("aria-label")))
      .toEqual(["Class I", "Class II", "Class III", "Class IV", "Class V"]);
    expect(document.querySelectorAll('[data-tooth][aria-pressed="true"]')).toHaveLength(0);
    expect(document.querySelector(".sd-arch")?.classList.contains("is-compact")).toBe(false);
    expect(within(currentFindings()).getByText("Select a tooth")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Reset dentition" }) as HTMLButtonElement).disabled).toBe(true);
    for (const button of within(classes).getAllByRole("button")) {
      expect(button.matches(":disabled")).toBe(true);
      expect(button.getAttribute("aria-pressed")).toBe("false");
      await user.click(button);
    }

    const summary = screen.getByText("Other findings", { selector: "summary" });
    expect(summary.closest("details")?.open).toBe(false);
    await user.click(summary);
    expect(summary.closest("details")?.open).toBe(true);
    const other = screen.getByRole("group", { name: "Other findings" });
    for (const button of within(other).getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
      await user.click(button);
    }
    expectNoObsoleteControls();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders all 32 permanent and 20 primary teeth once in FDI order", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    expectTeeth("permanent");
    await user.click(screen.getByRole("button", { name: /^Primary/ }));
    expectTeeth("primary");
    expect(document.querySelectorAll('[data-tooth][aria-pressed="true"]')).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /^Permanent/ }));
    expectTeeth("permanent");
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(CARIES_CLASSES.flatMap((cariesClass) => ([
    { cariesClass, dentition: "permanent" as const, number: "16" },
    { cariesClass, dentition: "primary" as const, number: "55" }
  ])))("records Class $cariesClass on a $dentition tooth immediately", async ({ cariesClass, dentition, number }) => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    if (dentition === "primary") await user.click(screen.getByRole("button", { name: /^Primary/ }));
    await user.click(tooth(number));
    const actions = screen.getByRole("region", { name: `Tooth ${number}` });
    const classes = within(actions).getByRole("group", { name: "Caries classes" }) as HTMLFieldSetElement;
    expect(classes.disabled).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    const crownBefore = tooth(number).querySelector(".tooth-crown")?.getAttribute("fill");

    const button = within(classes).getByRole("button", { name: `Class ${cariesClass}` });
    await user.click(button);

    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      ...emptyChart(),
      [dentition]: { [number]: [{ id: expect.any(String), kind: "caries", cariesClass, surfaces: [], note: "" }] }
    });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(tooth(number).getAttribute("aria-pressed")).toBe("true");
    expect(tooth(number).classList.contains("is-selected")).toBe(true);
    const badge = tooth(number).querySelector(".tooth-class-badge");
    expect(badge?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(badge?.getAttribute("data-classes")).toBe(cariesClass);
    expect(badge?.querySelector("text")?.textContent).toBe(cariesClass);
    expect(tooth(number).querySelector(".tooth-crown")?.getAttribute("fill")).not.toBe(crownBefore);
    expect(tooth(dentition === "primary" ? "54" : "17").querySelector("[data-classes]")).toBeNull();
    expect(within(record(`Caries · Class ${cariesClass}`)).getByText(MESSAGES.en.classDescriptions[cariesClass]))
      .toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(`Recorded · Tooth ${number} · Class ${cariesClass}`);
    expectNoObsoleteControls();
  });

  it("keeps distinct classes together and removes and undoes the named current record", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    await user.click(tooth("16"));
    for (const cariesClass of ["V", "II", "IV", "I", "III"]) {
      await user.click(screen.getByRole("button", { name: `Class ${cariesClass}` }));
    }
    const added = onChange.mock.calls.at(-1)![0];
    expect(onChange).toHaveBeenCalledTimes(5);
    expect(added.permanent["16"].map((finding) => finding.cariesClass)).toEqual(["V", "II", "IV", "I", "III"]);
    expect(new Set(added.permanent["16"].map((finding) => finding.id)).size).toBe(5);
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("I,II,III,IV,V");
    expect(within(currentFindings()).getAllByRole("listitem")).toHaveLength(5);

    await user.click(within(currentFindings()).getByRole("button", { name: "Remove finding: Caries · Class II" }));
    expect(onChange).toHaveBeenCalledTimes(6);
    expect(onChange.mock.calls.at(-1)![0].permanent["16"])
      .toEqual(added.permanent["16"].filter((finding) => finding.cariesClass !== "II"));
    expect(screen.getByRole("button", { name: "Class II" }).getAttribute("aria-pressed")).toBe("false");
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("I,III,IV,V");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenCalledTimes(7);
    expect(onChange.mock.calls.at(-1)![0]).toEqual(added);
    expect(record("Caries · Class II")).toBeTruthy();
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("I,II,III,IV,V");
  });

  it.each(["double click", "batched rapid clicks"])("does not emit duplicate classes or add undo steps after %s", async (interaction) => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    await user.click(tooth("16"));
    const button = screen.getByRole("button", { name: "Class II" });
    if (interaction === "double click") {
      await user.dblClick(button);
    } else {
      // Dispatch before React renders again to exercise stale event-handler state.
      act(() => { fireEvent.click(button); fireEvent.click(button); fireEvent.click(button); });
    }
    expect(onChange).toHaveBeenCalledTimes(1);
    const added = structuredClone(onChange.mock.calls[0][0]);
    expect(added.permanent["16"]).toHaveLength(1);
    expect(within(currentFindings()).getAllByRole("listitem")).toHaveLength(1);
    expect(tooth("16").querySelectorAll("[data-classes]")).toHaveLength(1);
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("II");

    await user.dblClick(button);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(added);
    expect(screen.getByRole("status").textContent).toContain("Already recorded");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0]).toEqual(emptyChart());
    expect(within(currentFindings()).getByText(MESSAGES.en.noFindings)).toBeTruthy();
    expect(tooth("16").querySelector("[data-classes]")).toBeNull();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each(FINDINGS.filter((kind) => kind !== "caries"))("records, removes and undoes whole-tooth %s from Other findings", async (kind) => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    await user.click(tooth("16"));
    const summary = screen.getByText("Other findings", { selector: "summary" });
    expect(summary.closest("details")?.open).toBe(false);
    await user.click(summary);
    expect(summary.closest("details")?.open).toBe(true);
    const other = screen.getByRole("group", { name: "Other findings" });
    expect(within(other).getAllByRole("button").map((button) => button.textContent))
      .toEqual(FINDINGS.filter((finding) => finding !== "caries").map((finding) => MESSAGES.en.findings[finding]));
    await user.dblClick(within(other).getByRole("button", { name: MESSAGES.en.findings[kind] }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      version: 1,
      permanent: { "16": [{ id: expect.any(String), kind, surfaces: [], note: "" }] },
      primary: {}
    });
    const added = onChange.mock.calls[0][0];
    expect(added.permanent["16"][0]).not.toHaveProperty("cariesClass");
    expect(within(record(MESSAGES.en.findings[kind])).getByText("Whole tooth")).toBeTruthy();
    expect(tooth("16").querySelector(`.tooth-label circle[fill="${COLORS[kind]}"]`)).not.toBeNull();
    if (kind === "filling") {
      expect(tooth("16").querySelector(".tooth-crown")?.getAttribute("fill")).toBe(COLORS.filling);
    }
    expectNoObsoleteControls();
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");

    await user.click(within(currentFindings()).getByRole("button", { name: `Remove finding: ${MESSAGES.en.findings[kind]}` }));
    expect(onChange.mock.calls.at(-1)![0]).toEqual(emptyChart());
    expect(within(currentFindings()).getByText(MESSAGES.en.noFindings)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls.at(-1)![0]).toEqual(added);
    expect(record(MESSAGES.en.findings[kind])).toBeTruthy();
  });
});

describe("DentalChart notes and history", () => {
  it("adds and edits secondary notes on blur, with one undo step per saved change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    await user.click(tooth("16"));
    await user.click(screen.getByRole("button", { name: "Class II" }));
    const label = "Caries · Class II";
    const addNote = within(record(label)).getByText("Add note", { selector: "summary" });
    expect(addNote.closest("details")?.open).toBe(false);
    await user.click(addNote);
    expect(addNote.closest("details")?.open).toBe(true);
    let input = screen.getByRole("textbox", { name: `Short note: ${label}` }) as HTMLTextAreaElement;
    expect(input.maxLength).toBe(160);
    await user.type(input, "  Review proximal margin  ");
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(2);
    const firstNote = onChange.mock.calls[1][0];
    expect(firstNote.permanent["16"][0].note).toBe("Review proximal margin");
    expect(within(record(label)).getByText("Review proximal margin", { selector: "p" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Note saved · Tooth 16");

    const editNote = within(record(label)).getByText("Edit note", { selector: "summary" });
    if (editNote.closest("details")?.open) await user.click(editNote);
    await user.click(editNote);
    input = screen.getByRole("textbox", { name: `Short note: ${label}` }) as HTMLTextAreaElement;
    expect(input.value).toBe("Review proximal margin");
    await user.clear(input);
    await user.type(input, "Monitor at review");
    expect(onChange).toHaveBeenCalledTimes(2);
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls[2][0].permanent["16"][0].note).toBe("Monitor at review");

    input = screen.getByRole("textbox", { name: `Short note: ${label}` }) as HTMLTextAreaElement;
    await user.click(input);
    await user.keyboard("{End}  ");
    await user.tab();
    expect(input.value).toBe("Monitor at review");
    expect(onChange).toHaveBeenCalledTimes(3);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange.mock.calls.at(-1)![0]).toEqual(firstNote);
    expect(within(record(label)).getByText("Review proximal margin", { selector: "p" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange.mock.calls.at(-1)![0].permanent["16"][0].note).toBe("");
    expect(within(record(label)).getByText("Add note", { selector: "summary" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenCalledTimes(6);
    expect(onChange.mock.calls.at(-1)![0]).toEqual(emptyChart());
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
  });

  it.each(["tooth", "language", "dentition"])("saves a focused note to its original tooth when changing %s", async (change) => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    const initial = emptyChart();
    initial.permanent["16"] = [{ id: "target", kind: "caries", cariesClass: "II", surfaces: [], note: "" }];
    initial.permanent["26"] = [{ id: "neighbor", kind: "caries", cariesClass: "V", surfaces: [], note: "Other tooth" }];
    initial.primary["55"] = [{ id: "primary", kind: "filling", surfaces: [], note: "Primary note" }];
    render(<DentalChart initialLanguage="en" initialValue={initial} onChange={onChange} />);
    await user.click(tooth("16"));
    await user.click(within(record("Caries · Class II")).getByText("Add note", { selector: "summary" }));
    await user.type(screen.getByRole("textbox", { name: "Short note: Caries · Class II" }), "Belongs to 16");
    expect(onChange).not.toHaveBeenCalled();

    if (change === "tooth") await user.click(tooth("26"));
    if (change === "language") await user.click(screen.getByRole("button", { name: "العربية" }));
    if (change === "dentition") await user.click(screen.getByRole("button", { name: /^Primary/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0][0];
    expect(saved).toEqual({
      ...initial,
      permanent: {
        ...initial.permanent,
        "16": [{ ...initial.permanent["16"][0], note: "Belongs to 16" }]
      }
    });
    expect(initial.permanent["16"][0].note).toBe("");
    if (change === "tooth") {
      expect(tooth("26").getAttribute("aria-pressed")).toBe("true");
      expect(within(currentFindings()).getByText("Other tooth", { selector: "p" })).toBeTruthy();
      await user.click(tooth("16"));
    }
    if (change === "language") {
      expect(tooth("16", "ar").getAttribute("aria-pressed")).toBe("true");
      expect(within(currentFindings("ar")).getByText("Belongs to 16", { selector: "p" })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "English" }));
    }
    if (change === "dentition") {
      await user.click(tooth("55"));
      expect(within(currentFindings()).getByText("Primary note", { selector: "p" })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: /^Permanent/ }));
    }
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
    expect(within(record("Caries · Class II")).getByText("Belongs to 16", { selector: "p" })).toBeTruthy();
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0]).toEqual(initial);
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("remembers each dentition's selection, confirms scoped reset and undoes across dentitions", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    await user.click(tooth("16"));
    await user.click(screen.getByRole("button", { name: "Class II" }));
    const permanent = onChange.mock.calls[0][0];
    await user.click(screen.getByRole("button", { name: /^Primary/ }));
    expect((screen.getByRole("group", { name: "Caries classes" }) as HTMLFieldSetElement).disabled).toBe(true);
    await user.click(tooth("55"));
    await user.click(screen.getByRole("button", { name: "Class II" }));
    const both = onChange.mock.calls[1][0];
    expect(both.permanent).toEqual(permanent.permanent);
    expect(both.primary["55"][0]).toMatchObject({ kind: "caries", cariesClass: "II", surfaces: [] });
    await user.click(screen.getByRole("button", { name: /^Permanent/ }));
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: /^Primary/ }));
    expect(tooth("55").getAttribute("aria-pressed")).toBe("true");
    expect(onChange).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Reset dentition" }));
    expect(confirm).toHaveBeenCalledExactlyOnceWith(MESSAGES.en.confirmPrimary);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(record("Caries · Class II")).toBeTruthy();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Reset dentition" }));
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls[2][0]).toEqual(permanent);
    expect(tooth("55").getAttribute("aria-pressed")).toBe("true");
    expect(within(currentFindings()).getByText(MESSAGES.en.noFindings)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange.mock.calls[3][0]).toEqual(both);
    expect(record("Caries · Class II")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Permanent/ }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: /^Primary/ }).getAttribute("aria-pressed")).toBe("true");
    expect(onChange.mock.calls[4][0]).toEqual(permanent);
    expect(tooth("55").getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: /^Permanent/ }).getAttribute("aria-pressed")).toBe("true");
    expect(onChange).toHaveBeenCalledTimes(6);
    expect(onChange.mock.calls[5][0]).toEqual(emptyChart());
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the latest missing/implant precedence and restores anatomy on removal and undo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    render(<DentalChart initialLanguage="en" onChange={onChange} />);
    await user.click(tooth("16"));
    await user.click(screen.getByRole("button", { name: "Class II" }));
    await user.click(screen.getByText("Other findings", { selector: "summary" }));
    const other = within(screen.getByRole("group", { name: "Other findings" }));
    for (const name of ["Filling / Restoration", "Crown", "Root Canal"]) {
      await user.click(other.getByRole("button", { name }));
    }
    const crown = tooth("16").querySelector(".tooth-crown")!;
    expect(crown.getAttribute("fill")).toBe(COLORS.crown);
    expect(tooth("16").querySelector(`g[stroke="${COLORS.rootCanal}"]`)).not.toBeNull();
    await user.click(other.getByRole("button", { name: "Missing" }));
    expect(crown.getAttribute("stroke-dasharray")).toBe("3 3");
    expect(crown.getAttribute("fill")).not.toBe(COLORS.crown);
    expect(tooth("16").querySelector(`g[stroke="${COLORS.rootCanal}"]`)).toBeNull();
    await user.click(other.getByRole("button", { name: "Implant" }));
    const implanted = onChange.mock.calls.at(-1)![0];
    expect(crown.getAttribute("stroke-dasharray")).toBeNull();
    expect(crown.getAttribute("fill")).toBe(COLORS.crown);
    expect(tooth("16").querySelector(`g[fill="${COLORS.implant}"]`)).not.toBeNull();
    expect(tooth("16").querySelector(`g[stroke="${COLORS.rootCanal}"]`)).toBeNull();
    await user.click(other.getByRole("button", { name: "Missing" }));
    expect(onChange.mock.calls.at(-1)![0].permanent["16"].map((finding) => finding.kind))
      .toEqual(["caries", "filling", "crown", "rootCanal", "missing", "implant", "missing"]);
    expect(crown.getAttribute("stroke-dasharray")).toBe("3 3");
    expect(tooth("16").querySelector(`g[fill="${COLORS.implant}"]`)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange.mock.calls.at(-1)![0]).toEqual(implanted);
    expect(tooth("16").querySelector(`g[fill="${COLORS.implant}"]`)).not.toBeNull();
    await user.click(within(currentFindings()).getByRole("button", { name: "Remove finding: Implant" }));
    expect(crown.getAttribute("stroke-dasharray")).toBe("3 3");
    await user.click(within(currentFindings()).getByRole("button", { name: "Remove finding: Missing" }));
    expect(crown.getAttribute("stroke-dasharray")).toBeNull();
    expect(crown.getAttribute("fill")).toBe(COLORS.crown);
    expect(tooth("16").querySelector(`g[stroke="${COLORS.rootCanal}"]`)).not.toBeNull();
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("II");
  });
});

describe("DentalChart snapshot ownership", () => {
  it.each(["Legacy note ".repeat(20), "  Original spacing  "])("leaves an untouched imported note unchanged on blur", async (note) => {
    const user = userEvent.setup();
    const initial = emptyChart();
    initial.permanent["16"] = [{ id: "legacy", kind: "filling", surfaces: ["M"], note }];
    const onChange = vi.fn();
    render(<DentalChart initialLanguage="en" initialValue={initial} onChange={onChange} />);
    await user.click(tooth("16"));
    await user.click(within(record("Filling / Restoration")).getByText("Edit note", { selector: "summary" }));
    const input = screen.getByRole("textbox", { name: "Short note: Filling / Restoration" }) as HTMLTextAreaElement;
    expect(input.value).toBe(note);
    await user.click(input);
    await user.tab();
    expect(input.value).toBe(note);
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Class II" }));
    expect(onChange.mock.calls[0][0].permanent["16"][0]).toEqual(initial.permanent["16"][0]);
  });

  it("imports legacy caries as unclassified and preserves legacy surfaces and fillings", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    const initial = emptyChart();
    initial.permanent["16"] = [
      { id: "legacy-caries", kind: "caries", surfaces: ["M", "D"], note: "Review old caries" },
      { id: "legacy-filling", kind: "filling", surfaces: ["O", "L"], note: "Existing restoration" }
    ];
    const before = structuredClone(initial);
    render(<DentalChart initialLanguage="en" initialValue={initial} onChange={onChange} />);
    await user.click(tooth("16"));
    expect(onChange).not.toHaveBeenCalled();
    expect(within(record("Caries")).getByText(MESSAGES.en.legacyCaries)).toBeTruthy();
    expect(within(record("Filling / Restoration")).getByText("Existing restoration", { selector: "p" })).toBeTruthy();
    for (const cariesClass of CARIES_CLASSES) {
      expect(screen.getByRole("button", { name: `Class ${cariesClass}` }).getAttribute("aria-pressed")).toBe("false");
    }
    expect(tooth("16").querySelector("[data-classes]")).toBeNull();
    expect(tooth("16").querySelectorAll(`path[fill="${COLORS.caries}"]`)).toHaveLength(2);
    expect(tooth("16").querySelector(".tooth-crown")?.getAttribute("fill")).toBe(COLORS.filling);

    await user.click(screen.getByRole("button", { name: "Class II" }));
    const added = onChange.mock.calls[0][0];
    expect(added.version).toBe(1);
    expect(added.permanent["16"].slice(0, 2)).toEqual(before.permanent["16"]);
    expect(added.permanent["16"][0]).not.toHaveProperty("cariesClass");
    expect(added.permanent["16"][2]).toEqual({
      id: expect.any(String), kind: "caries", cariesClass: "II", surfaces: [], note: ""
    });
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("II");
    expect(tooth("16").querySelectorAll(`path[fill="${COLORS.caries}"]`)).toHaveLength(2);
    expect(tooth("16").querySelector(".tooth-crown")?.getAttribute("fill")).toBe(COLORS.filling);

    await user.click(within(record("Caries")).getByText("Edit note", { selector: "summary" }));
    const input = screen.getByRole("textbox", { name: "Short note: Caries" });
    await user.clear(input);
    await user.type(input, "Reviewed, still unclassified");
    await user.tab();
    expect(onChange.mock.calls[1][0].permanent["16"][0]).toEqual({
      ...before.permanent["16"][0], note: "Reviewed, still unclassified"
    });
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange.mock.calls[2][0]).toEqual(added);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange.mock.calls[3][0]).toEqual(before);
    expect(tooth("16").querySelector("[data-classes]")).toBeNull();
    expect(initial).toEqual(before);
    expectNoObsoleteControls();
  });

  it("owns initialValue once and never mutates caller data or earlier clinical snapshots", async () => {
    const user = userEvent.setup();
    const initial = emptyChart();
    initial.permanent["16"] = [{ id: "restoration", kind: "filling", surfaces: ["M", "L"], note: "Original note" }];
    initial.primary["55"] = [{ id: "primary", kind: "crown", surfaces: [], note: "Primary note" }];
    const mounted = structuredClone(initial);
    const firstCallback = vi.fn();
    const { rerender } = render(<DentalChart initialLanguage="en" initialValue={initial} onChange={firstCallback} />);
    initial.permanent["16"][0].surfaces.push("D");
    initial.permanent["16"][0].note = "Caller changed";
    initial.primary["55"][0].note = "Caller changed primary";
    const callerData = structuredClone(initial);
    const replacement = emptyChart();
    replacement.permanent["26"] = [{ id: "replacement", kind: "missing", surfaces: [], note: "Must not load" }];
    const copies: ChartValue[] = [];
    const onChange = vi.fn((value: ChartValue) => {
      copies.push(structuredClone(value));
      // Consumers may retain or freeze any previously emitted snapshot.
      for (const dentition of [value.permanent, value.primary]) {
        for (const findings of Object.values(dentition)) {
          for (const finding of findings) {
            Object.freeze(finding.surfaces);
            Object.freeze(finding);
          }
          Object.freeze(findings);
        }
        Object.freeze(dentition);
      }
      Object.freeze(value);
    });
    rerender(<DentalChart initialLanguage="en" initialValue={replacement} onChange={onChange} />);
    await user.click(tooth("26"));
    expect(within(currentFindings()).getByText(MESSAGES.en.noFindings)).toBeTruthy();
    await user.click(tooth("16"));
    expect(within(currentFindings()).getByText("Original note", { selector: "p" })).toBeTruthy();
    expect(firstCallback).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Class II" }));
    const added = onChange.mock.calls[0][0];
    expect(added.permanent["16"][0]).toEqual(mounted.permanent["16"][0]);
    expect(added.primary).toEqual(mounted.primary);
    expect(added).not.toBe(initial);
    for (const [dentition, number] of [["permanent", "16"], ["primary", "55"]] as const) {
      expect(added[dentition]).not.toBe(initial[dentition]);
      expect(added[dentition][number]).not.toBe(initial[dentition][number]);
      expect(added[dentition][number][0]).not.toBe(initial[dentition][number][0]);
      expect(added[dentition][number][0].surfaces).not.toBe(initial[dentition][number][0].surfaces);
    }

    await user.click(within(record("Filling / Restoration")).getByText("Edit note", { selector: "summary" }));
    const input = screen.getByRole("textbox", { name: "Short note: Filling / Restoration" });
    await user.clear(input);
    await user.type(input, "Edited note");
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(onChange.mock.calls[1][0].permanent["16"][0].note).toBe("Edited note");
    expect(added.permanent["16"][0].note).toBe("Original note");
    await user.click(within(currentFindings()).getByRole("button", { name: "Remove finding: Caries · Class II" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Reset dentition" }));
    expect(onChange.mock.calls[3][0]).toEqual({ version: 1, permanent: {}, primary: mounted.primary });
    for (let index = 0; index < 4; index++) {
      await user.click(screen.getByRole("button", { name: "Undo" }));
    }
    expect(onChange).toHaveBeenCalledTimes(8);
    expect(onChange.mock.calls[7][0]).toEqual(mounted);
    onChange.mock.calls.forEach(([value], index) => expect(value).toEqual(copies[index]));
    expect(initial).toEqual(callerData);
    expect(firstCallback).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("DentalChart navigation and layout", () => {
  it("changes UI language and direction without mirroring anatomy or emitting clinical changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: ChartValue) => void>();
    render(<DentalChart onChange={onChange} />);
    expect(screen.getByRole("main").getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("heading", { name: MESSAGES.ar.title, level: 1 })).toBeTruthy();
    await user.click(tooth("16", "ar"));
    await user.click(screen.getByRole("button", { name: `${MESSAGES.ar.classLabel} II` }));
    expect(screen.getByRole("region", { name: `${MESSAGES.ar.tooth} 16` })).toBeTruthy();
    const added = structuredClone(onChange.mock.calls[0][0]);
    function geometry() {
      return Array.from(document.querySelectorAll("[data-tooth]")).map((element) => ({
        number: element.getAttribute("data-tooth"),
        transforms: Array.from(element.querySelectorAll("[transform]"))
          .map((part) => part.getAttribute("transform"))
      }));
    }
    const before = geometry();
    expect(tooth("16", "ar").closest("[dir]")?.getAttribute("dir")).toBe("ltr");
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("main").getAttribute("dir")).toBe("ltr");
    expect(screen.getByRole("main").getAttribute("lang")).toBe("en");
    expect(screen.getByRole("heading", { name: "Dental chart", level: 1 })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Tooth 16" })).toBeTruthy();
    expect(record("Caries · Class II")).toBeTruthy();
    expect(geometry()).toEqual(before);
    expectTeeth("permanent");
    await user.click(screen.getByRole("button", { name: "العربية" }));
    expect(screen.getByRole("main").getAttribute("dir")).toBe("rtl");
    expect(tooth("16", "ar").getAttribute("aria-pressed")).toBe("true");
    expect(tooth("16", "ar").closest("[dir]")?.getAttribute("dir")).toBe("ltr");
    expect(geometry()).toEqual(before);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(added);
  });

  it.each([
    { language: "en", activation: "{Enter}" },
    { language: "ar", activation: " " }
  ] as const)("supports Tab, $activation, arrows, Home and End in $language", async ({ language, activation }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const t = MESSAGES[language];
    render(<DentalChart initialLanguage={language} onChange={onChange} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: new RegExp(`^${t.permanent}`) }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: new RegExp(`^${t.primary}`) }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: language === "en" ? "العربية" : "English" }));
    await user.tab();
    expect(document.activeElement).toBe(tooth("18", language));
    expect(tooth("18", language).getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelectorAll('[data-tooth][tabindex="0"]')).toHaveLength(1);
    await user.keyboard(activation);
    expect(tooth("18", language).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("group", { name: t.cariesClasses }) as HTMLFieldSetElement).disabled).toBe(false);
    for (const [key, number] of [
      ["ArrowLeft", "18"], ["ArrowUp", "18"], ["ArrowRight", "17"], ["ArrowLeft", "18"], ["ArrowRight", "17"],
      ["ArrowDown", "47"], ["ArrowUp", "17"], ["End", "28"], ["Home", "18"],
      ["ArrowDown", "48"], ["End", "38"], ["ArrowRight", "38"], ["ArrowDown", "38"], ["Home", "48"]
    ]) {
      await user.keyboard(`{${key}}`);
      expect(document.activeElement).toBe(tooth(number, language));
      expect(tooth(number, language).getAttribute("aria-pressed")).toBe("true");
      expect(tooth(number, language).getAttribute("tabindex")).toBe("0");
      expect(document.querySelectorAll('[data-tooth][aria-pressed="true"]')).toHaveLength(1);
      expect(document.querySelectorAll('[data-tooth][tabindex="0"]')).toHaveLength(1);
    }
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: `${t.classLabel} I` }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(tooth("48", language));
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: t.undo }) as HTMLButtonElement).disabled).toBe(true);
    await user.tab();
    const classButton = screen.getByRole("button", { name: `${t.classLabel} I` });
    expect(document.activeElement).toBe(classButton);
    await user.keyboard(activation);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].permanent["48"][0]).toMatchObject({ kind: "caries", cariesClass: "I", surfaces: [] });
    expect(tooth("48", language).getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(classButton);
    await user.keyboard(activation);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("switches compact viewport mode without duplicating teeth or losing either dentition's data", async () => {
    const user = userEvent.setup();
    const media = Object.assign(new EventTarget(), { matches: false, media: "(max-width: 700px)" });
    const matchMedia = vi.fn(() => media);
    const unsubscribe = vi.spyOn(media, "removeEventListener");
    vi.stubGlobal("matchMedia", matchMedia);
    const onChange = vi.fn<(value: ChartValue) => void>();
    const { unmount } = render(<DentalChart initialLanguage="en" onChange={onChange} />);
    expectTeeth("permanent");
    const arch = document.querySelector("svg.sd-arch")!;
    expect(arch.classList.contains("is-compact")).toBe(false);
    const widePosition = tooth("16").querySelector("g[transform]")?.getAttribute("transform");
    await user.click(tooth("16"));
    await user.click(screen.getByRole("button", { name: "Class II" }));
    const permanent = onChange.mock.calls[0][0];
    act(() => { media.matches = true; media.dispatchEvent(new Event("change")); });
    expect(matchMedia).toHaveBeenCalledWith("(max-width: 700px)");
    expect(arch.classList.contains("is-compact")).toBe(true);
    expect(arch.getAttribute("viewBox")).toBe("0 0 480 560");
    expect(tooth("16").querySelector("g[transform]")?.getAttribute("transform")).not.toBe(widePosition);
    expectTeeth("permanent");
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("II");
    expect(record("Caries · Class II")).toBeTruthy();
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.click(tooth("16"));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tooth("23"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tooth("21"));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tooth("28"));
    await user.click(tooth("16"));

    await user.click(screen.getByRole("button", { name: /^Primary/ }));
    expectTeeth("primary");
    await user.click(tooth("55"));
    await user.click(screen.getByText("Other findings", { selector: "summary" }));
    await user.click(screen.getByRole("button", { name: "Filling / Restoration" }));
    const both = structuredClone(onChange.mock.calls[1][0]);
    expect(both.permanent).toEqual(permanent.permanent);
    expect(both.primary["55"][0]).toMatchObject({ kind: "filling", surfaces: [], note: "" });
    expect(tooth("55").querySelector(".tooth-crown")?.getAttribute("fill")).toBe(COLORS.filling);
    act(() => { media.matches = false; media.dispatchEvent(new Event("change")); });
    expect(arch.classList.contains("is-compact")).toBe(false);
    expectTeeth("primary");
    expect(tooth("55").getAttribute("aria-pressed")).toBe("true");
    expect(record("Filling / Restoration")).toBeTruthy();
    expect(tooth("55").querySelector(".tooth-crown")?.getAttribute("fill")).toBe(COLORS.filling);
    await user.click(screen.getByRole("button", { name: /^Permanent/ }));
    expectTeeth("permanent");
    expect(tooth("16").getAttribute("aria-pressed")).toBe("true");
    expect(tooth("16").querySelector("g[transform]")?.getAttribute("transform")).toBe(widePosition);
    expect(tooth("16").querySelector("[data-classes]")?.getAttribute("data-classes")).toBe("II");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0]).toEqual(both);
    unmount();
    expect(unsubscribe).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
