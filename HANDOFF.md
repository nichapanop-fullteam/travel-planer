# Handoff — Share button + shared-trip page redesign

Linear: [TEC-927](https://linear.app/techfullteam/issue/TEC-927/share-button-shared-trip-page-redesign) (status: In Progress)

## Context

Two repos involved:
- `/Users/nichapa/pluno` — Next.js frontend (branch: `main`, also `develop`)
- `/Users/nichapa/pluno-service` — NestJS backend (branch: `main`, also `develop`)

Both repos follow: feature branch → merge into `develop` (push) → merge `develop` into `main` (push). This was done for every change below.

## What shipped this session (in order)

1. **Share modal fix** — `generated-plan/[id]/page.tsx` and `view/trip/[id]/page.tsx` were calling `navigator.share()` directly for the owner's "แชร์" button, which pops the native OS share sheet on Safari/macOS instead of the already-built-but-unwired `ShareTripDialog` component (copy link, disable/re-enable, regenerate, revoke). Wired it up: owner → opens `ShareTripDialog`; non-owner → still falls back to `navigator.share`/clipboard (share-link endpoints are owner-only).
2. **`/shared-trips/[shareToken]` page redesign** — restyled to match `/view/trip/[id]` (the "Remix Trip" page): added a "Trip Overview" section, reverted the day-switcher to the app's actual pill-in-tray style (`PlanTab`'s, not an underline-tab variant I tried first and had to walk back), removed a 5-stat overlay grid, centered the hero text block vertically.
3. **Backend: publish more per-stop detail** (`pluno-service`, `PublicSharedTripResponseDto` + `SharesManagerService`) — added `cost` (existing `costAmount`, zero new privacy risk — it's a price tag, not who-paid data), `place.address` (existing `place.description` column, already had the data), and **live** `place.openingHours` / `place.description` fetched per-place from Google Places Details (Enterprise+Atmosphere SKU, ~$35–40/1000 calls, cached 24h keyed by externalRef, gracefully skips hand-typed places with no `externalRef`, swallows per-place failures). This is a real ongoing Google billing cost on an unauthenticated route — user explicitly approved after seeing the pricing.
4. **Frontend: render those new fields** in `SharedTripPlan.tsx`'s activity card, matching a reference screenshot design (travel-mode icon+label in the meta row, coin icon before cost, a divider rule, "เปิด/ปิด · <today's hours>" with Google's weekday-name prefix stripped, address as its own line with rating folded in).
5. **Removed a redundant "Trip hack" box** — discovered `activity.travelNote` is *never* an authored tip; it's just the same duration/distance already shown in the meta row, confirmed via the backend's own doc comment ("kept for clients that still render the original display-only field"). Was literally showing "~15 นาที" twice under a misleading label.

All of the above is committed and pushed to `origin/main` and `origin/develop` on **both** repos already. Test suites pass (392/392 backend, all frontend suites except one pre-existing unrelated failure — `my-trips/__tests__/refresh.test.tsx`, fails identically on a clean checkout, `window.matchMedia` not mocked in jsdom, nothing to do with this work).

## Known blocker — NOT resolved

**`pluno-service` has no auto-deploy pipeline.** No GitHub Actions, no Cloud Build trigger in the repo — just a `Dockerfile`. Pushing to `main` on GitHub does **not** deploy to the production Cloud Run service (`travel-planner-api-git-909858882015.asia-northeast3.run.app`). Confirmed by polling the live API after push — no new fields appeared. This machine has no `gcloud` CLI installed, so I cannot deploy it myself. **The user needs to deploy `pluno-service` manually** (however they normally do it) before `cost`/`address`/`openingHours`/`description` will actually appear on the live share page. The frontend (`pluno`) *does* auto-deploy via Vercel on push — confirmed working.

## Open investigation — INTERRUPTED, not concluded

User reported: **"ปุ่มแชร์ ทำไมกลับมาเป็นเหมือนเดิม"** (share button went back to the old native-share-sheet behavior) — after the fix above had already been shown working once.

What I'd confirmed before being interrupted:
- The code on `main` still has the fix intact — `ShareTripDialog` is imported and wired in both files, `isOwner` gate is present and looks correct, the fix commit (`8f62c61`) is still an ancestor of `main`. Nothing was reverted in the code.
- The design is *intentional* that a **non-owner** (or anyone where `isOwner` resolves `false`) still falls back to `navigator.share()` — so if the user tested while not authenticated as the trip's owner, this is expected, not a bug.
- Started checking the actual browser session at `localhost:3000`: the homepage shows what looks like a logged-in avatar icon top-right, **but navigating to `/my-trips` redirected straight to the login page**, and `localStorage` has zero keys (no `accessToken` under any common name). This is suspicious — either:
  - the avatar icon on the homepage is stale/cached markup that doesn't reflect real auth state, or
  - the app stores its auth token somewhere other than `localStorage` (cookie? sessionStorage? in-memory only, refetched via `/auth/me` on load?) and `/my-trips` has a stricter/different guard than the homebase, or
  - the local dev server's session had genuinely expired/never existed and the homepage avatar was a leftover render.
- **Next step, not yet done**: check `sessionStorage` and cookies for an auth token; find `AuthProvider`/`useAuth` in the frontend source to see exactly where and how the token is stored and what `/my-trips`'s guard checks vs. what the homepage checks; then reproduce the share button directly — open a trip this session's user actually owns, click "แชร์", and see whether `isOwner` is true and the modal opens, or false and native share fires. That will confirm whether the "regression" is actually just an auth/session state issue in the test environment, not a code problem.

## Files most relevant for a fresh session to re-open

- `/Users/nichapa/pluno/src/app/generated-plan/[id]/page.tsx` (`handleShareClick`, `handleSocialShare`, `isOwner`)
- `/Users/nichapa/pluno/src/app/view/trip/[id]/page.tsx` (`handleShare`, `isOwner`)
- `/Users/nichapa/pluno/src/providers/AuthProvider.tsx` (not yet inspected this session — check how/where the token is persisted)
- `/Users/nichapa/pluno/src/app/my-trips/page.tsx` (not yet inspected — check its auth guard)
