import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RemixSetupDialog } from "@/components/plan/RemixSetupDialog";

const source = { title: "หลวงพระบาง 3 วัน 2 คืน", creatorName: "TravelWithTawn", durationDays: 3 };

describe("RemixSetupDialog", () => {
  it("renders the source summary and the fixed copy-protection statement", () => {
    render(
      <RemixSetupDialog onClose={vi.fn()} source={source} status="idle" onSubmit={vi.fn()} />
    );

    expect(screen.getByText(/หลวงพระบาง 3 วัน 2 คืน/)).toBeInTheDocument();
    expect(screen.getByText(/TravelWithTawn/)).toBeInTheDocument();
    expect(
      screen.getByText("ระบบจะสร้างสำเนาเป็นทริปส่วนตัวของคุณ การแก้ไขจะไม่กระทบแผนต้นฉบับ")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "สร้างทริปของฉัน" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });

  // Client-side field validation itself lives in useRemixTrip (see
  // useRemixTrip.test.ts's "blocks submission on invalid form data" —
  // asserting there that remixTrip()/the API is never called). This checks
  // the dialog's half of that contract: it surfaces the resulting
  // validation_error state as a visible, blocking error rather than
  // silently succeeding.
  it("surfaces a validation_error status as a blocking inline error", () => {
    const onSubmit = vi.fn();
    render(
      <RemixSetupDialog
        onClose={vi.fn()}
        source={source}
        status="validation_error"
        message="กรุณากรอกชื่อทริป"
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText("กรุณากรอกชื่อทริป")).toBeInTheDocument();
    // Not disabled — the traveler must be able to fix the field and retry.
    expect(screen.getByRole("button", { name: "สร้างทริปของฉัน" })).toBeEnabled();
  });

  it("disables the submit button and shows the loading label while submitting", () => {
    render(<RemixSetupDialog onClose={vi.fn()} source={source} status="submitting" onSubmit={vi.fn()} />);

    const submitButton = screen.getByRole("button", { name: /กำลังสร้างทริป/ });
    expect(submitButton).toBeDisabled();
  });

  // jsdom doesn't evaluate media queries, so this asserts the responsive
  // classes are present rather than an actual rendered layout — mobile
  // bottom-sheet (items-end + rounded-t-3xl) vs desktop centered modal
  // (sm:items-center + sm:rounded-3xl).
  it("carries both the mobile bottom-sheet and desktop centered-modal layout classes", () => {
    render(<RemixSetupDialog onClose={vi.fn()} source={source} status="idle" onSubmit={vi.fn()} />);

    const overlay = screen.getByRole("button", { name: "ยกเลิก" }).closest("div[class*='fixed inset-0']");
    expect(overlay?.className).toMatch(/items-end/);
    expect(overlay?.className).toMatch(/sm:items-center/);

    const panel = screen.getByRole("button", { name: "ยกเลิก" }).closest("div.rounded-t-3xl");
    expect(panel?.className).toMatch(/sm:rounded-3xl/);
  });

  it("shows the mapped duration-mismatch error message", () => {
    render(
      <RemixSetupDialog
        onClose={vi.fn()}
        source={source}
        status="duration_mismatch"
        expectedDurationDays={3}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/จำนวนวันที่เลือกไม่ตรงกับแผนต้นฉบับ กรุณาเลือกช่วงเวลา 3 วัน/)).toBeInTheDocument();
  });
});
