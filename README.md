# SL2 Calculator Suite

A static, installable character calculator for Sigrogana Legend 2. It keeps the original retro-terminal presentation while adding validated data, offline use, resilient local saves, and private URL-fragment sharing.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The complete local quality gate is:

```sh
npm run check
npm run build
```

`check` validates all game data, type-checks the app, and runs the Vitest suite. `build` creates the static Cloudflare Pages output in `dist/` and also generates the web app manifest and service worker.

## Updating game data

JSON is the only authoritative authoring format. Calculator records live in:

- `src/data/content/` — stats, rules, races, classes, bonuses, optimizer reference profiles, and one weapon file per category
- `src/data/armors.json` — armor records grouped by armor type
- `src/data/game-data.json` — data/schema versions and player-facing change notes

Weapon and armor `id` values are permanent references. Keep an existing ID unchanged if its display name changes. To publish an update:

1. Edit the relevant JSON records.
2. Set `dataVersion` and `updatedAt` in `src/data/game-data.json`.
3. Add concise player-facing entries to its `changes` array.
4. Run `npm run check`; fix every file/record/field error it reports.
5. Run `npm run build` and inspect the production preview with `npm run preview`.
6. Push the change to a preview branch, accept it on the Cloudflare Pages preview URL, then merge to `main`.

Files under `reference/` are historical notes only and are not authoritative or included in the application bundle.

### Optimizer reference profiles

`src/data/content/optimizer-profiles.json` stores representative community builds as regression fixtures and optional soft optimizer priors. A profile may guide class pairing and the shape of final scaled stats, but it never overrides formulas, point limits, the current race/equipment, or explicit minimum constraints. Class skills that are not represented by structured calculator data are not simulated.

Keep profiles disabled when their race or class data is unavailable. The retained Redtail Chemist / Monk example follows this rule until authoritative Chemist stats and passive information are added.

### Build-generator guidance

`SL2BuildInfo.docx` is the primary planning reference for generated builds. The executable checklist in `src/domain/buildGuide.ts` applies the document's supported endgame baselines to optimizer ranking and reports every unmodeled or version-sensitive rule as requiring verification. See `docs/BUILD_GENERATOR_GUIDELINES.md` for the input contract, required output order, uncertainty labels, and complete validation checklist.

The document's exactly-48 scaled APT, at-least-57 scaled SKI, and at-least-35 final VIT targets supersede older generic preset descriptions when evaluating a generated endgame build. The mapping from calculator `rawStats` to the document's “final” label is an explicit assumption, not a game-data fact.

## Saves, imports, and sharing

The calculator maintains an explicit recovery draft and supports named save slots in browser storage. It never automatically restores a recovery draft or silently overwrites a named save. Storage failures are caught so the live calculator remains usable.

Exports use the versioned `BuildFileV1` JSON shape. Existing v0.5.0 files are migrated transactionally, including equipment and valid zero values. Share links store a compressed, validated build in `#build=...`; fragments are not sent to Cloudflare. Links are limited to 20 KB compressed and 100 KB after decompression.

Storage keys are `sl2:prefs:v1`, `sl2:draft:v1`, and `sl2:saves:v1`.

## Cloudflare Pages

Create a frontend-only Pages project with these settings:

- Production branch: `main`
- Preview branches: `Dev-Preview`, `feature/*`, and `fix/*`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22
- Pages Functions: none

Cloudflare's branch/PR preview is the acceptance environment. Keep preview indexing disabled, and exclude automated dependency branches from preview builds to conserve the free monthly build allowance.

Enable **Web Analytics** in the Pages dashboard under Analytics & Logs. The Content Security Policy permits Cloudflare's beacon, but the app adds no custom behavioral tracking and never submits build/save contents. Dashboard configuration is intentionally not stored in this repository.

`public/_headers` defines immutable caching for fingerprinted assets, revalidation for the application shell/service worker, clickjacking protection, a restrictive permissions policy, and the production CSP. Verify these response headers after each Cloudflare configuration change.

## Offline and update behavior

The generated PWA precaches the app, lazy workspaces, data, and self-hosted fonts. Navigation uses network-first behavior with a cached shell fallback; fingerprinted assets remain cache-first. Updates are shown as a user-controlled prompt and never force-refresh an active draft. Obsolete Workbox caches are removed during service-worker activation.

The route prefix `/api/*` is reserved for a possible future feedback or short-link service. It is not implemented in this milestone and must not be captured by the SPA fallback if introduced later.
