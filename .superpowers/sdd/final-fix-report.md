# Final Fix Report — Polar.sh Payments Integration (Important-severity bugs)

## Status: DONE
**Commit:** 8eedaf9 (branch: master)  
**TypeScript result:** PASS — 0 errors, 0 warnings

---

## Fixes Applied

### Fix 1 — Webhook whsec_ prefix not stripped
**File:** `backend/app/routes/polar.py`  
Stripped `whsec_` prefix via `removeprefix("whsec_")` before attempting `base64.b64decode`. This ensures HMAC verification uses the correct secret bytes instead of always falling back to raw-string encoding, which was causing every webhook to return 403.

### Fix 2 — Subtitle paywall shows wrong plan for Basic subscribers
**File:** `mobile/src/screens/SubtitlesScreen.tsx`  
Changed `requiredPlan: "basic"` to `requiredPlan: plan === "free" ? "basic" : "pro"` in `handleRecord`. Basic subscribers who exhaust their daily quota are now correctly directed to the Pro upgrade paywall instead of the Basic paywall they already hold.

### Fix 3 — Subscription cache not invalidated on sign-out
**File:** `mobile/src/hooks/useSubscription.ts`  
Added `invalidateSubscriptionCache()` call at the top of the `SIGNED_OUT` branch in `onAuthStateChange`. The already-imported function now runs before state reset, preventing a subsequent user from inheriting the previous user's cached plan within the 5-minute TTL window.

---

All three fixes were applied and committed in a single commit on master (8eedaf9).
