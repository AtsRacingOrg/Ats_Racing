# Ats Racing — UI Standards

> Engineering and design conventions for the Angular UI app (`apps/ui`).
> Stack: **Angular 21 (standalone, signals, zoneless-ready) + PrimeNG 21 + Tailwind CSS 3 + SCSS**.
> Visual reference: [detailx.ancorathemes.com/car-tuning](https://detailx.ancorathemes.com/car-tuning/) — automotive dark theme, condensed display type, crimson accent.

Anyone — human or AI — touching the UI must read this document first. Pull requests that violate these rules should be rejected during review.

---

## 1. Project structure

```
apps/ui/src/
├─ app/
│  ├─ core/                    # singleton infra: api clients, interceptors, guards, tokens, config
│  │  ├─ api/                  # generated OpenAPI clients + thin wrappers
│  │  ├─ guards/
│  │  ├─ interceptors/
│  │  └─ services/
│  ├─ shared/                  # reusable, presentational, framework-agnostic-ish
│  │  ├─ ui/                   # dumb components (button, card, section-title, ...)
│  │  ├─ directives/
│  │  ├─ pipes/
│  │  └─ models/               # cross-feature TS interfaces & types
│  ├─ layout/                  # app shell: header, footer, top-bar, mobile nav
│  ├─ features/
│  │  ├─ home/
│  │  ├─ about/
│  │  ├─ shop/
│  │  ├─ contact/
│  │  └─ auth/                 # login / register / reset
│  ├─ app.routes.ts            # top-level routes (lazy children per feature)
│  ├─ app.config.ts            # providers, router, http, prime config
│  └─ app.ts                   # root standalone component (shell)
├─ assets/
├─ styles/
│  ├─ tokens.scss              # SCSS exports of design tokens (single source for SCSS)
│  ├─ primeng-overrides.scss   # PrimeNG theme overrides
│  └─ utilities.scss
├─ environments/
├─ index.html
├─ main.ts
└─ styles.scss                 # imports tailwind + tokens + primeng overrides
```

**Rules**
- A folder under `features/` is **lazy-loaded** via `loadChildren` or `loadComponent`. Never import a feature module from another feature.
- `core/` is imported once at app bootstrap; never from features.
- `shared/` may import from `shared/` and nothing else. No business logic.
- Cross-feature data types live in `shared/models/`. Feature-internal types live next to their feature.

---

## 2. Components

### 2.1 Always standalone, always OnPush
- `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush`.
- Use **signals** for local state, `input()` / `output()` / `model()` for I/O. Avoid `@Input()` / `@Output()` decorators in new code.
- Lifecycle: prefer `effect()` over `ngOnChanges`. Use `DestroyRef` + `takeUntilDestroyed` for subscription teardown — never manual `Subscription.unsubscribe()` in components.

### 2.2 Naming
| Thing | Convention | Example |
|---|---|---|
| Component class | `PascalCase`, no suffix | `HeroBanner` |
| Selector | `app-` prefix, kebab | `app-hero-banner` |
| Folder & files | kebab, files end with role | `hero-banner/hero-banner.ts`, `.html`, `.scss` |
| Smart / container | suffix `*-page` | `home-page` |
| Dumb / presentational | no suffix | `service-card` |
| Service | suffix `Service` | `CartService` |
| Signal | noun, no prefix | `items()` not `getItems()` |
| Output event | verb, past tense | `submitted`, `selected` |

### 2.3 Templates
- Use the new control flow: `@if`, `@for`, `@switch`, `@defer`. **No `*ngIf` / `*ngFor` in new code.**
- Bind images with `NgOptimizedImage` (`ngSrc`). Always set `width`, `height`, and `priority` for above-the-fold hero images.
- Never write logic in templates beyond simple property access. Heavier expressions → `computed()` signal.
- Use `track` expressions in `@for` — usually `track item.id`. Never `track $index` for dynamic lists.

### 2.4 Smart vs dumb
- A page (smart) owns: routing, data fetching, state, side effects.
- A presentational component takes `input()`s and emits `output()`s. No injected services beyond pure helpers.
- Pages live in `features/<feature>/pages/`. Dumb components in `features/<feature>/components/` (or `shared/ui/` if reused).

---

## 3. Styling — Tailwind + SCSS + PrimeNG

### 3.1 Order of precedence
1. **Design tokens** (`styles/tokens.scss` + Tailwind config) — single source of truth.
2. **Tailwind utilities** in templates — preferred for layout, spacing, typography.
3. **Component SCSS** for: complex state-based styles, animations, multi-element selectors. Keep it under ~150 LOC per component.
4. **PrimeNG overrides** — in `styles/primeng-overrides.scss`, scoped per component (e.g. `.p-button { … }`).

### 3.2 Design tokens (mirrored from reference)

```scss
// styles/tokens.scss
$color-bg:         #0D0C0F;  // primary dark surface
$color-bg-alt:     #18171A;  // elevated dark surface
$color-bg-light:   #F4F4F4;  // light alt surface
$color-surface:    #FFFFFF;
$color-border:     #D9D9D9;

$color-text:           #615F5C; // body
$color-text-strong:    #18171A; // headings on light
$color-text-onDark:    #FFFFFF;
$color-text-muted:     #949087;

$color-accent:         #EA0A0B; // brand crimson — CTA / links
$color-accent-hover:   #FF2020;

$font-display: 'Barlow Condensed', system-ui, sans-serif;
$font-body:    'DM Sans', system-ui, sans-serif;

$radius-none: 0;
$radius-sm:   2px;
$radius-md:   4px;

$container-px: 70px;      // outer page padding on desktop
$section-py:   96px;      // vertical rhythm between sections
```

Tailwind config must expose the same tokens under `theme.extend.colors.brand.*`, `fontFamily.display/body`, etc. **Never hard-code a hex in a template** — always reference a token (`bg-brand-dark`, `text-brand-accent`).

### 3.3 Typography rules
- Headings (`h1`–`h6`): `font-display`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: -0.01em` on h1/h2.
- Body: `font-body`, `font-size: 1.125rem` (18px), `line-height: 1.62`.
- Use a `<app-section-title>` component for the recurring "eyebrow + heading + lead" trio rather than re-styling per page.

### 3.4 Buttons
- Reference uses **sharp** (zero-radius), **uppercase**, **letter-spacing ~1.4px** buttons.
- Standardize through PrimeNG `Button` with theme overrides:
  - `p-button` → `bg-brand-accent`, `text-white`, `rounded-none`, `uppercase`, `tracking-[0.1em]`, `px-10 py-3 md:px-12 md:py-4`.
  - `p-button-outlined` → border 1px, transparent bg, hover fills.
- Never use `<button>` styled ad-hoc in a template. If a new variant is needed, add it to overrides + document here.

### 3.5 Layout grid
- Outer container: `max-w-[1440px] mx-auto px-6 md:px-12 lg:px-[70px]`.
- Section vertical padding: `py-16 md:py-24` (~64–96px).
- Use CSS Grid for cards/portfolio: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.

---

## 4. PrimeNG usage

- Import **only the modules used** per component (`ButtonModule`, `InputTextModule`, …). No global `BrowserModule` re-exports.
- Theme: use the unstyled / token-driven approach (`@primeng/themes` with our own preset). Override in `primeng-overrides.scss` not inline.
- Icons: PrimeIcons for UI affordances. Use external icon set (e.g. `lucide`) only if PrimeIcons lacks the glyph — document the addition.
- Prefer PrimeNG primitives over rebuilding: `p-button`, `p-inputtext`, `p-select`, `p-dialog`, `p-toast`, `p-paginator`, `p-progressbar`, `p-tabs`.

---

## 5. Routing & data

### 5.1 Routes
- Top-level routes in `app.routes.ts`. Each feature owns its own `*.routes.ts` exported as a const array, loaded via `loadChildren: () => import('./features/x/x.routes').then(m => m.X_ROUTES)`.
- Route paths are kebab-case. Avoid deep nesting (> 3 segments) unless the URL meaningfully reflects it.
- Use **route data** for static page metadata (title, description). A single `TitleStrategy` reads it.

### 5.2 Data fetching
- HTTP via `HttpClient` wrapped in a typed service per resource (e.g. `ProductsApi`).
- Prefer **`resource()` / `httpResource()`** (Angular 21) for declarative data. Use `rxResource` for streams.
- Cache aggressively for read-only reference data; never cache user-specific data without an explicit invalidation path.
- Always handle the **loading**, **error**, **empty** states in the template — no spinners that never resolve.

### 5.3 Forms
- **Reactive forms only.** No template-driven forms.
- Validators co-located with the form definition. Cross-field validators as separate exported functions.
- Show validation errors only after `touched || submitted`. Use a small `<app-form-error>` helper.
- Submit buttons: disabled while `form.invalid` AND while async submission is in flight (`submitting()` signal).

---

## 6. Accessibility (a11y)

- All interactive elements reachable by keyboard. Visible focus ring is **mandatory** (`focus-visible:outline-2 outline-brand-accent`).
- Color contrast ≥ **4.5:1** for body text, ≥ **3:1** for large text and UI components. Verify red `#EA0A0B` on dark `#0D0C0F`: contrast ≈ 5.2:1 ✓.
- Every form input has an associated `<label>` (or `aria-label`). Errors linked via `aria-describedby`.
- Icon-only buttons require `aria-label`.
- Images: meaningful `alt`; decorative images use `alt=""` and `aria-hidden="true"`.
- Respect `prefers-reduced-motion` — wrap non-essential animations.

---

## 7. Performance

- **No eager imports across feature boundaries.** Each top-level route is lazy.
- Use `@defer (on viewport)` for below-the-fold heavy blocks (portfolio gallery, testimonials).
- Images: `NgOptimizedImage` with explicit dimensions; serve WebP/AVIF; use `priority` only for the LCP image.
- Bundle budgets in `project.json`:
  - initial: warn 500kB, error 700kB
  - per component style: warn 4kB, error 8kB
- Avoid `zone.js` event listeners in hot paths — prefer signals + zoneless change detection where possible.
- Treeshake PrimeNG: import per-component modules, never the whole library.

---

## 8. State management

- Start with **signals + services** (`providedIn: 'root'` for app-wide, `providedIn: 'platform'` never).
- Reach for NgRx / Signal Store only when state is shared across ≥ 3 unrelated features and has non-trivial async coordination. Document the decision in the PR.
- One source of truth per piece of state. Derive everything else with `computed()`.

---

## 9. Testing

- **Unit / component**: Vitest + `@analogjs/vitest-angular` (already wired). Co-locate `*.spec.ts` next to the file under test.
- Cover: signals/computed logic, services, validators, pipes, critical templates (smoke). **Don't** test framework internals.
- **E2E**: Playwright (already wired). One spec per page covering the happy path + one critical edge case.
- Snapshot tests are forbidden for components — they rot.

---

## 10. Internationalization

- Default app language: **Turkish (`tr`)** with English (`en`) as a planned second locale.
- All user-visible strings go through `@angular/localize` (`i18n` attribute / `$localize` template literals). No bare strings in templates.
- Date / number / currency: `DatePipe` / `CurrencyPipe` with the active locale.

---

## 11. Code style & quality

- TypeScript `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- ESLint + Angular ESLint + Prettier — run via Nx (`nx lint ui`, `nx format:write`).
- **No `any`**, no `as unknown as X`, no `// @ts-ignore` without an attached TODO and issue link.
- Prefer `type` aliases for unions/intersections, `interface` for object shapes that are extended.
- Imports sorted; absolute paths via `@app/*`, `@shared/*`, `@core/*` (configured in `tsconfig.base.json`). No `../../../`.

### 11.1 Comments
- Default: write **no** comments. Names and structure should explain the code.
- Allowed: a single line explaining **why** something non-obvious exists (a workaround, a constraint, a regulatory rule).
- Forbidden: tutorials, ticket numbers, change logs, "added by X", banner comments.

### 11.2 File length heuristics
- A component file (`.ts + .html + .scss`) over ~250 LOC total is a smell. Split it.
- A service over ~200 LOC is a smell. Split by concern.

---

## 12. Git workflow

- **Branch per feature**: `feat/<scope>-<short-name>` (e.g. `feat/ui-home`, `feat/ui-shop`). Bugs: `fix/<scope>-<bug>`. Chores: `chore/<scope>-<thing>`.
- One PR per branch. PR title follows commit convention; body uses the standard template (Summary + Test plan).
- **Commit messages** follow Conventional Commits:
  - `feat(ui-home): hero section with CTA`
  - `fix(ui-shop): grid collapses below 360px`
  - `refactor(shared): extract section-title`
  - `chore(ui): bump primeng to 21.2`
- No force push to `main`. Rebase locally to keep history linear; merge with **squash** to main.
- Every PR runs `nx affected:lint`, `nx affected:test`, `nx affected:build`. All green before merge.

---

## 13. Page-level conventions (this project)

### 13.1 Pages we ship now
| Route | Page component | Notes |
|---|---|---|
| `/` | `HomePage` | Hero, services, portfolio, features, news, newsletter |
| `/about` | `AboutPage` | Story, team, stats, values |
| `/shop` | `ShopPage` | Product grid + filter sidebar + paginator |
| `/contact` | `ContactPage` | Form + map placeholder + hours |
| `/login` | `LoginPage` | Reactive form, future-ready for Supabase auth |

### 13.2 Section pattern (Home & marketing pages)
1. **Hero** — full-bleed dark, condensed display heading, accent CTA.
2. **Sticky meta** — small badge row (years exp, services, customers).
3. **Services** — 3- or 4-column card grid.
4. **Showcase / portfolio** — masonry or 3-col grid with hover-zoom.
5. **Feature strip** — "Why us" with icon + short copy.
6. **Testimonials** — slider (PrimeNG `Carousel`).
7. **Latest news / blog teaser**.
8. **Newsletter CTA** — dark band, single input + button.
9. **Footer**.

Each section is its own component, no inline duplication across pages.

### 13.3 Header
- Logo left, primary nav center, secondary actions (search, cart, login) right.
- Sticky on scroll past hero. Background turns from transparent to `bg-brand-dark/90 backdrop-blur` once sticky.
- Mobile (< 1024px): hamburger → `p-sidebar` slide-in.

### 13.4 Footer
- Dark, three or four columns: brand + about, sitemap, contact, socials.
- Legal strip at the bottom with year + © Ats Racing.

---

## 14. Environment & config

- All runtime values come from `environments/environment*.ts`. No `process.env` in browser code.
- API base URL: `environment.apiBaseUrl`. Defaults to `http://localhost:3000/api` in dev.
- Feature flags as a typed const map (`FEATURE_FLAGS`), not scattered booleans.

---

## 15. Definition of Done (per page / feature)

A page is "done" when **all** of the following hold:

- [ ] Standalone, OnPush, signals-based.
- [ ] Lazy-loaded route registered, with `title` data.
- [ ] Matches the agreed design at desktop (≥ 1440px), tablet (768px), mobile (375px).
- [ ] No console errors / warnings; no a11y violations from axe quick scan.
- [ ] Lighthouse mobile score ≥ 90 for Performance, Accessibility, Best Practices.
- [ ] Unit tests for non-trivial logic; one Playwright happy-path spec.
- [ ] `nx lint ui` and `nx build ui` succeed with no new warnings.
- [ ] No `TODO`s left without an issue link.
- [ ] PR description explains the change and includes screenshots of all breakpoints.

---

_Last updated: 2026-05-26 — first version, derived from the reference site audit._
