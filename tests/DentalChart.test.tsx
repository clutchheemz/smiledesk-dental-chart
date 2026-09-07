import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DentalChart } from "../src/DentalChart";
import {
  FDI,
  FINDINGS,
  SURFACES,
  emptyChart,
  usesSurfaces,
  type ChartValue
} from "../src/model";
import { MESSAGES } from "../src/i18n";

afterEach(cleanup);

function details() {
  return screen.getByRole("complementary");
}

function currentFindings() {
  return within(details()).getByRole("region", {
    name: "Current findings"
  });
}

describe("DentalChart interactions", () => {
  it("renders every permanent and primary FDI tooth in order", async () => {
    const user = userEvent.setup();
    render(<DentalChart initialLanguage="en" />);

    function renderedNumbers() {
      return Array.from(
        document.querySelectorAll<SVGGElement>("[data-tooth]")
      ).map((element) => element.dataset.tooth);
    }

    expect(renderedNumbers()).toEqual([
      ...FDI.permanent.upper,
      ...FDI.permanent.lower
    ]);

    await user.click(
      screen.getByRole("button", { name: /^Primary/ })
    );

    expect(renderedNumbers()).toEqual([
      ...FDI.primary.upper,
      ...FDI.primary.lower
    ]);
  });

  it("selects teeth, toggles multiple surfaces, saves notes and removes findings", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Tooth 16" }));

    expect(
      screen.getByRole("button", { name: "Tooth 16" })
        .getAttribute("aria-pressed")
    ).toBe("true");

    const apply = screen.getByRole("button", {
      name: "Apply finding"
    }) as HTMLButtonElement;

    expect(apply.disabled).toBe(true);

    const o = screen.getByRole("button", { name: "O — Occlusal" });
    const m = screen.getByRole("button", { name: "M — Mesial" });

    await user.click(o);
    await user.click(m);
    await user.click(o);

    expect(o.getAttribute("aria-pressed")).toBe("false");
    expect(m.getAttribute("aria-pressed")).toBe("true");

    await user.click(o);
    await user.type(
      screen.getByLabelText("Short note"),
      "Review proximal margin"
    );
    await user.click(apply);

    const value = onChange.mock.calls.at(-1)![0] as ChartValue;

    expect(value.permanent["16"][0]).toMatchObject({
      kind: "caries",
      surfaces: ["O", "M"],
      note: "Review proximal margin"
    });

    expect(
      within(currentFindings()).getByText("Review proximal margin")
    ).toBeTruthy();

    await user.click(
      within(currentFindings()).getByRole("button", {
        name: "Remove finding: Caries"
      })
    );

    expect(
      within(currentFindings()).getByText(
        "No findings recorded for this tooth."
      )
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(
      within(currentFindings()).getByText("Review proximal margin")
    ).toBeTruthy();
  });

  it("applies all seven findings and all five surfaces", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const t = MESSAGES.en;

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    const toolbar = screen.getByRole("group", {
      name: "Choose a finding"
    });

    for (const kind of FINDINGS) {
      await user.click(
        within(toolbar).getByRole("button", {
          name: t.findings[kind]
        })
      );

      if (usesSurfaces(kind)) {
        for (const surface of SURFACES) {
          await user.click(
            screen.getByRole("button", {
              name: `${surface} — ${t.surfaces[surface]}`
            })
          );
        }
      } else {
        expect(
          screen
            .getByRole("button", { name: "O — Occlusal" })
            .closest("fieldset")?.disabled
        ).toBe(true);
      }

      await user.click(
        screen.getByRole("button", { name: "Apply finding" })
      );
    }

    const value = onChange.mock.calls.at(-1)![0] as ChartValue;
    const findings = value.permanent["11"];

    expect(findings.map((finding) => finding.kind)).toEqual(FINDINGS);
    expect(findings[0].surfaces).toEqual(SURFACES);
    expect(findings[1].surfaces).toEqual(SURFACES);

    for (const finding of findings.slice(2)) {
      expect(finding.surfaces).toEqual([]);
    }

    expect(
      within(currentFindings()).getAllByRole("button", {
        name: /^Remove finding:/
      })
    ).toHaveLength(7);

    // Every category can actually be removed.
    for (const kind of FINDINGS) {
      await user.click(
        within(currentFindings()).getByRole("button", {
          name: `Remove finding: ${t.findings[kind]}`
        })
      );
    }

    const cleared = onChange.mock.calls.at(-1)![0] as ChartValue;
    expect(cleared.permanent["11"]).toBeUndefined();
  });

  it("preserves both dentitions and confirms reset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <DentalChart initialLanguage="en" onChange={onChange} />
    );

    const toolbar = screen.getByRole("group", {
      name: "Choose a finding"
    });

    await user.click(
      within(toolbar).getByRole("button", { name: "Crown" })
    );

    await user.click(
      screen.getByRole("button", { name: "Apply finding" })
    );

    await user.click(
      screen.getByRole("button", { name: /^Primary/ })
    );

    await user.type(
      screen.getByLabelText("Short note"),
      "Primary note"
    );

    await user.click(
      screen.getByRole("button", { name: "Apply finding" })
    );

    let value = onChange.mock.calls.at(-1)![0] as ChartValue;

    expect(value.permanent["11"]).toHaveLength(1);
    expect(value.primary["51"][0].note).toBe("Primary note");

    await user.click(
      screen.getByRole("button", { name: "Reset dentition" })
    );

    expect(confirm).toHaveBeenCalledOnce();

    expect(
      within(currentFindings()).getByText("Primary note")
    ).toBeTruthy();

    confirm.mockReturnValue(true);

    await user.click(
      screen.getByRole("button", { name: "Reset dentition" })
    );

    value = onChange.mock.calls.at(-1)![0] as ChartValue;

    expect(value.primary).toEqual({});
    expect(value.permanent["11"]).toHaveLength(1);

    await user.click(
      screen.getByRole("button", { name: "Undo" })
    );

    expect(
      within(currentFindings()).getByText("Primary note")
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /^Permanent/ })
    );

    expect(
      within(currentFindings()).getByText("Crown")
    ).toBeTruthy();
  });

  it("switches languages without mirroring anatomy or changing clinical data", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DentalChart initialLanguage="ar" onChange={onChange} />
    );

    expect(screen.getByRole("main").getAttribute("dir")).toBe("rtl");

    expect(
      screen.getByRole("heading", {
        name: "مخطط الأسنان",
        level: 1
      })
    ).toBeTruthy();

    const before = Array.from(
      document.querySelectorAll("[data-tooth]")
    ).map((element) => element.getAttribute("data-tooth"));

    await user.click(
      screen.getByRole("button", { name: /English/ })
    );

    expect(screen.getByRole("main").getAttribute("dir")).toBe("ltr");

    expect(
      screen.getByRole("heading", {
        name: "Dental chart",
        level: 1
      })
    ).toBeTruthy();

    const after = Array.from(
      document.querySelectorAll("[data-tooth]")
    ).map((element) => element.getAttribute("data-tooth"));

    expect(after).toEqual(before);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: /العربية/ })
    );

    expect(
      screen.getByRole("main").getAttribute("dir")
    ).toBe("rtl");
  });

  it("supports keyboard tooth selection and initialValue", async () => {
    const user = userEvent.setup();
    const initial = emptyChart();

    initial.permanent["21"] = [
      {
        id: "existing",
        kind: "filling",
        surfaces: ["M", "L"],
        note: "Existing restoration"
      }
    ];

    render(
      <DentalChart
        initialLanguage="en"
        initialValue={initial}
      />
    );

    const tooth = screen.getByRole("button", {
      name: "Tooth 21"
    });

    tooth.focus();

    await user.keyboard("{Enter}");

    expect(
      tooth.getAttribute("aria-pressed")
    ).toBe("true");

    expect(
      within(currentFindings()).getByText(
        "Existing restoration"
      )
    ).toBeTruthy();

    expect(
      initial.permanent["21"][0].note
    ).toBe("Existing restoration");
  });
});