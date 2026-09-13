import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TravelConnectorRow } from "@/components/plan/SelfPlanBuilderTab";
import type { Activity, TravelSegment } from "@/types";

function stop(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "a2",
    time: "09:00",
    title: "วัดพระสิงห์วรมหาวิหาร",
    category: "sightseeing",
    cost: 0,
    ...overrides,
  } as Activity;
}

function segment(overrides: Partial<TravelSegment> = {}): TravelSegment {
  return {
    id: "seg-1",
    fromItemId: "a1",
    toItemId: "a2",
    orderIndex: 0,
    travelMode: "DRIVE",
    routeStatus: "CALCULATED",
    durationMinutes: 12,
    distanceKilometers: 5.4,
    ...overrides,
  } as TravelSegment;
}

describe("TravelConnectorRow — which travel figure wins", () => {
  it("shows the plan's own estimate instead of an empty prompt", () => {
    render(
      <TravelConnectorRow
        fromTitle="โรงแรม ทราเวลลอดจ์ นิมมาน"
        toActivity={stop({ planTravelEstimate: { durationMin: 6, distanceKm: 2.99 } })}
        onSave={() => {}}
      />
    );

    expect(screen.getByText(/~6 นาที · 2.99 กม./)).toBeInTheDocument();
    expect(screen.getByText(/ประมาณการจากแผน/)).toBeInTheDocument();
    expect(screen.queryByText("เพิ่มการเดินทาง")).not.toBeInTheDocument();
  });

  // The estimate is straight-line distance with a detour factor; the segment is
  // a real route. A guess must never outrank it.
  it("prefers a calculated segment over the plan's estimate", () => {
    render(
      <TravelConnectorRow
        fromTitle="โรงแรม ทราเวลลอดจ์ นิมมาน"
        toActivity={stop({ planTravelEstimate: { durationMin: 6, distanceKm: 2.99 } })}
        travelSegment={segment()}
        onSave={() => {}}
      />
    );

    expect(screen.getByText(/12 นาที/)).toBeInTheDocument();
    expect(screen.queryByText(/ประมาณการจากแผน/)).not.toBeInTheDocument();
  });

  it("prefers what the traveller entered over both", () => {
    render(
      <TravelConnectorRow
        fromTitle="โรงแรม ทราเวลลอดจ์ นิมมาน"
        toActivity={stop({
          planTravelEstimate: { durationMin: 6, distanceKm: 2.99 },
          travelFromPrevious: { type: "walk", durationMin: 20 },
        })}
        travelSegment={segment()}
        onSave={() => {}}
      />
    );

    expect(screen.getByText(/20 นาที/)).toBeInTheDocument();
    expect(screen.queryByText(/ประมาณการจากแผน/)).not.toBeInTheDocument();
  });

  it("still asks for input when there is nothing to show at all", () => {
    render(
      <TravelConnectorRow fromTitle="โรงแรม" toActivity={stop()} onSave={() => {}} />
    );

    expect(screen.getByText("เพิ่มการเดินทาง")).toBeInTheDocument();
  });

  // A leg the provider could not route still has the plan's estimate behind
  // it, and a labelled guess beats "ยังคำนวณเส้นทางไม่ได้" with no number at all.
  it("falls back to the estimate when routing failed", () => {
    render(
      <TravelConnectorRow
        fromTitle="โรงแรม"
        toActivity={stop({ planTravelEstimate: { durationMin: 6 } })}
        travelSegment={segment({ routeStatus: "FAILED", durationMinutes: null, distanceKilometers: null })}
        onSave={() => {}}
      />
    );

    expect(screen.getByText(/~6 นาที/)).toBeInTheDocument();
  });
});

// The empty-pill regression: the row drew a green pill with a delete button and
// nothing inside it. Every one of these used to hit that branch.
describe("TravelConnectorRow — never renders an empty pill", () => {
  // The pill's own button, not the delete button beside it — both carry an
  // aria-label mentioning the destination.
  function assertNotEmpty() {
    const pill = screen.getByLabelText(/แก้ไขการเดินทางไป/);
    expect(pill.textContent?.trim()).not.toBe("");
  }

  it("falls back when the segment status is one this build does not know", () => {
    render(
      <TravelConnectorRow
        fromTitle="Saffron Coffee"
        toActivity={stop()}
        travelSegment={segment({ routeStatus: "PENDING" as never })}
        onSave={() => {}}
        onDelete={async () => {}}
      />
    );

    assertNotEmpty();
    expect(screen.getByText("เพิ่มการเดินทาง")).toBeInTheDocument();
  });

  // A leg saved with numbers but no type — the column is nullable — found no
  // icon and no label, so the row had nothing left to draw.
  it("falls back when the entered leg has no usable type", () => {
    render(
      <TravelConnectorRow
        fromTitle="Saffron Coffee"
        toActivity={stop({
          travelFromPrevious: { durationMin: 6, distanceKm: 2.99 } as never,
        })}
        travelSegment={segment({ routeStatus: "PENDING" as never })}
        onSave={() => {}}
        onDelete={async () => {}}
      />
    );

    assertNotEmpty();
  });

  // Same broken leg, but the plan's own estimate is available — show that
  // rather than asking for something the traveller already has.
  it("prefers the plan estimate over the fallback prompt", () => {
    render(
      <TravelConnectorRow
        fromTitle="Saffron Coffee"
        toActivity={stop({
          travelFromPrevious: { durationMin: 6 } as never,
          planTravelEstimate: { durationMin: 6, distanceKm: 2.99 },
        })}
        travelSegment={segment({ routeStatus: "PENDING" as never })}
        onSave={() => {}}
        onDelete={async () => {}}
      />
    );

    expect(screen.getByText(/ประมาณการจากแผน/)).toBeInTheDocument();
  });
});

// view-trip and shared-trips render the connector with no onSave, so there is
// nothing behind the "+ เพิ่มการเดินทาง" prompt — it invites a reader to do
// something the page does not let them do. Read-only legs with nothing to
// report must disappear entirely.
describe("TravelConnectorRow — read-only never offers เพิ่มการเดินทาง", () => {
  it("renders nothing when the leg has no travel information", () => {
    const { container } = render(
      <TravelConnectorRow fromTitle="โรงแรม" toActivity={stop()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the segment status is one this build does not know", () => {
    const { container } = render(
      <TravelConnectorRow
        fromTitle="ร้านมาลองเต๊อะ เชียงราย"
        toActivity={stop()}
        travelSegment={segment({ routeStatus: "PENDING" as never })}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the entered leg has no usable type", () => {
    const { container } = render(
      <TravelConnectorRow
        fromTitle="ร้านมาลองเต๊อะ เชียงราย"
        toActivity={stop({ travelFromPrevious: { durationMin: 6 } as never })}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // Read-only hides the prompt, not the information: a leg the traveller can
  // actually read about still shows, as plain text.
  it("still shows a leg that has something to say", () => {
    render(
      <TravelConnectorRow
        fromTitle="ร้านมาลองเต๊อะ เชียงราย"
        toActivity={stop()}
        travelSegment={segment()}
      />
    );

    expect(screen.getByText(/12 นาที/)).toBeInTheDocument();
    expect(screen.queryByText("เพิ่มการเดินทาง")).not.toBeInTheDocument();
  });

  it("still shows the plan's own estimate", () => {
    render(
      <TravelConnectorRow
        fromTitle="ร้านมาลองเต๊อะ เชียงราย"
        toActivity={stop({ planTravelEstimate: { durationMin: 10, distanceKm: 5.06 } })}
      />
    );

    expect(screen.getByText(/ประมาณการจากแผน/)).toBeInTheDocument();
  });
});
