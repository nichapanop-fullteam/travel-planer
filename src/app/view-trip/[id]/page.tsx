"use client";

import GeneratedPlanPage from "@/app/generated-plan/[id]/page";

/** View Trip uses Generate Plan's data UI with all write actions disabled. */
export default function ViewTripPage() {
  return <GeneratedPlanPage readOnly />;
}
