# Mobile responsiveness for the web landing

## Goal

Make every page under `landing/` usable on phone-width viewports (~360–430px)
and tablet width (~768px), so users can register, use the dashboard tools, and
read marketing pages from a phone.

## Current state (audited 2026-07-08)

**Already responsive** — no work needed:
- `app/page.tsx` and its marketing components (`Hero`, `Header`, `Features`,
  `Footer`, `PricingSection`, `LanguageSection`, `GamificationSection`,
  `Stats`, `Download`, `CTASection`, `FounderStory`) rely on `clamp()` for
  fluid type and on named grid classes already defined in `globals.css`
  (`.hero-grid`, `.features-grid`, `.lang-grid`, `.gamification-grid`,
  `.footer-grid`, `.pricing-grid`) with `@media (max-width: 768px)` and
  `(max-width: 480px)` overrides.
- `Header.tsx` — working hamburger + mobile drawer (`.nav-desktop` /
  `.nav-mobile-btn` classes).
- `app/dashboard/layout.tsx` — Tailwind `md:` breakpoints, working mobile
  sidebar drawer. The dashboard *shell* is fine; only page *content* inside it
  needs auditing.
- `app/register/page.tsx`, `app/login/page.tsx`, `app/reset-password/page.tsx`
  — cards use `width: 100%; maxWidth: 440` inside a padded flex page, already
  fluid.

**Not responsive — in scope for this work** (zero `@media` queries, inline
pixel-based layouts that don't adapt):
- `app/dashboard/page.tsx`
- `app/dashboard/profile/page.tsx`
- `app/dashboard/learn/page.tsx`
- `app/profile/page.tsx`
- `app/about/page.tsx`
- `app/features/page.tsx`
- `app/blog/page.tsx`
- `app/blog/[slug]/page.tsx`
- `app/contact/page.tsx`
- `app/pricing/page.tsx` (the page wrapper, not `PricingSection`)
- `app/ai-tutor/page.tsx`
- `app/gamification/page.tsx`
- `app/camera-to-text/page.tsx`
- `app/text-to-sign/page.tsx`
- `app/sign-language/page.tsx` — fixed `gridTemplateColumns: "240px 1fr"` sidebar
- `app/subtitles/page.tsx` — fixed `gridTemplateColumns: "1fr 280px"` sidebar
- `app/subtitles/transcript/page.tsx` — fixed `gridTemplateColumns: "100px 1fr"` grid
- `app/terms/page.tsx`

**Known bug to fix as part of this work:**
`app/subtitles/page.tsx:1188` sets `style={{ gridTemplateColumns: "1fr 280px" }}`
*and* a Tailwind class `lg:grid-cols-[1fr_280px]` on the same element. An
inline `style` always wins over a CSS class for the same property regardless
of viewport, so the Tailwind responsive class currently does nothing — the
280px column never collapses on mobile. Fix: remove the conflicting inline
`gridTemplateColumns` and drive the layout from Tailwind classes only (e.g.
`grid grid-cols-1 lg:grid-cols-[1fr_280px]`), or convert to the same named
CSS-class + `@media` pattern used elsewhere in this spec — pick whichever
matches what's already surrounding that block.

**Partially responsive — audit and extend, don't rewrite:**
- `app/community/page.tsx` — has one `@media (max-width: 768px)` block already
- `app/sign-language/practice/page.tsx` — has two `@media` blocks already;
  also hardcodes camera `video: { width: 640, height: 480 }` — check the
  rendered container scales down on narrow screens even though the requested
  camera resolution stays fixed (that's fine, only the display box must fit).

**Explicitly out of scope:**
- `mobile/` (React Native/Expo app) — separate stack, not a web adaptivity concern.
- `backend/` — no UI.
- Visual/pixel-level redesign — this is a layout-adaptation pass, not a
  restyle. Keep existing colors, fonts, spacing values as they are; only
  layout properties (grid-template-columns, fixed multi-hundred-px widths,
  non-wrapping flex rows) change per breakpoint.

## Approach

For each in-scope file:
1. Identify layout-critical inline styles: multi-column `gridTemplateColumns`
   with fixed px tracks, elements with a hardcoded `width`/`minWidth` in the
   hundreds of px that isn't already wrapped in a responsive container, and
   `display: flex` rows of cards/columns that don't wrap and don't collapse.
2. Replace the inline layout value with a `className` reference to a new,
   purpose-named CSS class (e.g. `.dashboard-stats-grid`,
   `.sign-language-layout`, `.subtitles-layout`, `.transcript-grid`) — following
   the existing `.hero-grid` naming convention.
3. Define that class's base (desktop) rule plus `@media (max-width: 768px)`
   (and `(max-width: 480px)` where a further step-down is needed) in
   `app/globals.css`, colocated with the existing `/* ===== Responsive Layout
   Classes ===== */` section. If the page already has a local `<style jsx>`
   block with `@media` (community, sign-language/practice), extend that block
   instead of adding to `globals.css`, to keep the existing per-file
   convention.
4. Default mobile behavior for multi-column layouts: stack to a single
   column (`grid-template-columns: 1fr`) unless the page has a specific
   reason to keep two narrow columns (e.g. a label/value pair) — decide
   per-case during implementation, not upfront in this spec.
5. Do not touch colors, typography, spacing, or animations. Do not introduce
   Tailwind responsive classes into files that don't already use Tailwind for
   layout — stay consistent with each file's existing styling method (inline
   style + companion CSS class, matching what's already there).

## Testing target widths

375px (small phone), 768px (tablet breakpoint boundary already used in the
codebase), and confirm desktop (>1024px) is unchanged.

## Verification

- `npm run build` in `landing/` must succeed (Next.js/TypeScript catches
  broken JSX from the className/style edits).
- Structural check per changed file: grep confirms the new class name is
  both defined (in `globals.css` or the file's own `<style jsx>`) and applied
  in JSX, and confirms no fixed-px `gridTemplateColumns`/`width` leaked back
  in for the properties that were supposed to move to CSS.
- No visible or headless browser verification by default (matches standing
  preference — see project memory). If the user wants an actual visual check
  on a phone or in a resized browser window, that happens separately, at
  their request.

## Out of scope for follow-up

Nothing planned beyond this pass; if new pages are added later they should
follow the same named-class + `@media` convention established here.
