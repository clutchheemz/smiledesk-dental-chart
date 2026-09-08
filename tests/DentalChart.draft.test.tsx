import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DentalChart } from "../src/DentalChart";
import type { ChartValue } from "../src/model";

afterEach(cleanup);

function applyButton() {
  return screen.getByRole("button", { name: "Apply finding" });
}

function surfaceButton(name: string) {
  return screen.getByRole("button", { name });
}

function findingButton(name: string) {
  const toolbar = screen.getByRole("group", {
    name: "Choose a finding"
  });

  return within(toolbar).getByRole("button", { name });
}

function toothDots(number: string) {
  return document.querySelectorAll(
    `[data-tooth="${number}"] circle`
  ).length;
}

function currentFindings() {
  const details = screen.getByRole("complementary");

  return within(details).getByRole("region", {
    name: "Current findings"
  });
}

describe("explicit surface selection + Apply", () => {
  it("does not commit the mark before Apply", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    await user.click(screen.getByRole("button", { name: "Tooth 16" }));
    await user.click(surfaceButton("O — Occlusal"));
    await user.click(surfaceButton("M — Mesial"));

    // Draft only: no clinical commit, no rendered mark.
    expect(onChange).not.toHaveBeenCalled();
    expect(toothDots("16")).toBe(0);
    expect(
      within(currentFindings()).getByText(
        "No findings recorded for this tooth."
      )
    ).toBeTruthy();
  });

  it("commits Caries with O and M on Apply", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    await user.click(screen.getByRole("button", { name: "Tooth 16" }));
    await user.click(surfaceButton("O — Occlusal"));
    await user.click(surfaceButton("M — Mesial"));
    await user.click(applyButton());

    const value = onChange.mock.calls.at(-1)![0] as ChartValue;

    expect(value.permanent["16"][0]).toMatchObject({
      kind: "caries",
      surfaces: ["O", "M"]
    });
    expect(toothDots("16")).toBe(1);
    expect(
      within(currentFindings()).getByText("Caries")
    ).toBeTruthy();
  });

  it("commits every selected surface", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    await user.click(findingButton("Filling / Restoration"));
    await user.click(screen.getByRole("button", { name: "Tooth 16" }));

    for (const name of [
      "O — Occlusal",
      "M — Mesial",
      "D — Distal",
      "B — Buccal",
      "L — Lingual"
    ]) {
      await user.click(surfaceButton(name));
    }

    await user.click(applyButton());

    const value = onChange.mock.calls.at(-1)![0] as ChartValue;

    expect(value.permanent["16"][0]).toMatchObject({
      kind: "filling",
      surfaces: ["O", "M", "D", "B", "L"]
    });
  });

  it("commits only the final surface selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    await user.click(screen.getByRole("button", { name: "Tooth 16" }));
    await user.click(surfaceButton("O — Occlusal"));
    await user.click(surfaceButton("M — Mesial"));
    await user.click(surfaceButton("O — Occlusal"));
    await user.click(surfaceButton("D — Distal"));

    expect(onChange).not.toHaveBeenCalled();

    await user.click(applyButton());

    const value = onChange.mock.calls.at(-1)![0] as ChartValue;

    expect(value.permanent["16"][0].surfaces).toEqual(["M", "D"]);
  });

  it("commits non-surface findings directly via Apply", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    await user.click(findingButton("Crown"));
    await user.click(screen.getByRole("button", { name: "Tooth 16" }));

    expect(
      (applyButton() as HTMLButtonElement).disabled
    ).toBe(false);

    await user.click(applyButton());

    const value = onChange.mock.calls.at(-1)![0] as ChartValue;

    expect(value.permanent["16"][0]).toMatchObject({
      kind: "crown",
      surfaces: []
    });
    expect(toothDots("16")).toBe(1);
  });

  it("does not leak draft surfaces across teeth or findings", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    await user.click(screen.getByRole("button", { name: "Tooth 16" }));
    await user.click(surfaceButton("O — Occlusal"));
    await user.click(surfaceButton("M — Mesial"));

    // Switching tooth discards the uncommitted draft.
    await user.click(screen.getByRole("button", { name: "Tooth 17" }));

    expect(
      surfaceButton("O — Occlusal").getAttribute("aria-pressed")
    ).toBe("false");
    expect(
      surfaceButton("M — Mesial").getAttribute("aria-pressed")
    ).toBe("false");
    expect(
      (applyButton() as HTMLButtonElement).disabled
    ).toBe(true);
    expect(onChange).not.toHaveBeenCalled();

    // Switching finding discards the uncommitted draft too.
    await user.click(surfaceButton("B — Buccal"));
    await user.click(findingButton("Filling / Restoration"));

    expect(
      surfaceButton("B — Buccal").getAttribute("aria-pressed")
    ).toBe("false");
    expect(
      (applyButton() as HTMLButtonElement).disabled
    ).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps Undo, Remove and Reset correct after Apply", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    await user.click(screen.getByRole("button", { name: "Tooth 16" }));
    await user.click(surfaceButton("O — Occlusal"));
    await user.click(applyButton());

    expect(toothDots("16")).toBe(1);

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(toothDots("16")).toBe(0);

    let value = onChange.mock.calls.at(-1)![0] as ChartValue;
    expect(value.permanent["16"]).toBeUndefined();

    await user.click(surfaceButton("M — Mesial"));
    await user.click(applyButton());

    expect(toothDots("16")).toBe(1);

    await user.click(
      within(currentFindings()).getByRole("button", {
        name: "Remove finding: Caries"
      })
    );

    expect(toothDots("16")).toBe(0);

    await user.click(surfaceButton("D — Distal"));
    await user.click(applyButton());
    await user.click(
      screen.getByRole("button", { name: "Reset dentition" })
    );

    value = onChange.mock.calls.at(-1)![0] as ChartValue;
    expect(value.permanent).toEqual({});
    expect(confirm).toHaveBeenCalled();

    confirm.mockRestore();
  });
});
