// The backend keeps trip money as whole-trip totals for the whole group:
// `budgetLimit` is "เพดานรวมทั้งทริป (บาท) ไม่ใช่ต่อคน/วัน" per the API
// reference, and `totalBudget` is summed across every traveler. Everything
// this app shows or stores locally is per person instead — the budget tab
// says so on every figure ("ค่าใช้จ่ายต่อคน"), and amounts are typed in that
// way. These two convert between the two units, and should only ever be
// called where a value crosses the API boundary.
//
// groupSize is unknown for a trip that has never synced, and for a synced one
// whose owner row is gone. Both amounts pass through untouched then: a 1×
// conversion is the honest fallback, since guessing a traveler count would
// silently scale a real money figure by a made-up number.
export function toPerPersonAmount(wholeTrip: number, groupSize: number | undefined): number {
  return groupSize && groupSize > 0 ? Math.round(wholeTrip / groupSize) : wholeTrip;
}

export function toWholeTripAmount(perPerson: number, groupSize: number | undefined): number {
  return groupSize && groupSize > 0 ? Math.round(perPerson * groupSize) : perPerson;
}
