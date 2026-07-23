// The current user's own trip groups — trips they've joined/added to a group,
// distinct from the public feed of trips created by other travelers (feed-data.ts).
// Group chat and member info on the Trip Detail page only make sense for these.
export const myGroups = [{ tripId: "feed-luangprabang-3d", name: "ไปหลวงพระบางกันจ้า" }];

export function isMyGroupTrip(tripId: string): boolean {
  return myGroups.some((g) => g.tripId === tripId);
}
