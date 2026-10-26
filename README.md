# Aether Codex

A static, installable character builder for Sigrogana Legend 2. The sheet covers race, classes, attributes, equipment, skills, traits, talents, racials, Youkai and mixtures, with every derived figure computed live from validated game data. It works offline, keeps local saves, and shares builds through private URL fragments.

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

`npm run smoke:aether` renders the sheet over CDP in a browser started with `--remote-debugging-port` and reports console errors. `src/aether/README.md` documents the sheet's design and the game rules it enforces.

## Updating game data

JSON is the only authoritative authoring format. Calculator records live in:

- `src/data/content/` — stats, rules, races, classes, bonuses, and one weapon file per category
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

## Saves, imports, and sharing

The sheet autosaves a draft to browser storage and restores it on the next visit. Named save slots are kept alongside it. Storage failures are caught so the sheet remains usable.

Exports use the versioned `BuildFileV1` JSON shape. Share links store a compressed, validated build in `#build=...`; fragments are not sent to Cloudflare. Links are limited to 20 KB compressed and 100 KB after decompression. A shared build is offered, never applied automatically.

Storage keys are `sl2:aether:draft:v1`, `sl2:aether:saves:v1`, `sl2:aether:prefs:v1`, `sl2:aether:theme:v1`, `sl2:aether:statview:v1` and `sl2:aether:intro:v1`.

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

`public/_redirects` sends the retired `/classic` URLs and the old `/aether.html` address to `/`, keeping any `#build=` fragment.

## Offline and update behavior

The generated PWA precaches the app, data, and self-hosted fonts. Navigation uses network-first behavior with a cached shell fallback; fingerprinted assets remain cache-first. Updates are shown as a user-controlled prompt and never force-refresh an active draft. Obsolete Workbox caches are removed during service-worker activation.

The route prefix `/api/*` is reserved for a possible future feedback or short-link service. It is not implemented and must not be captured by the SPA fallback if introduced later.
