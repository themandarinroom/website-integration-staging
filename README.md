# The Mandarin Room — unified website integration v1.0

Six responsive pages following the six approved mockups, with real published Vocabulary previews and independent AI/Teacher Voice, year/topic browsing, resource search, public Unit metadata previews, existing activity links, protected Admin entry links and bilingual About. Unimplemented activities and contact delivery are visibly unavailable.

**Live staging:** https://themandarinroom.github.io/website-integration-staging/

The staging source is isolated from all existing application repositories. It makes anonymous read-only requests for public resources; it has no Firebase SDK, auth, backend, writes or curriculum cache. The existing apps retain ownership of editing, student workflows, recordings and permissions.

## Preview and checks

Requires Node 22+ for tests and Python 3 for local serving; no npm dependencies or build step.

```sh
npm run check
npm test
node scripts/verify-payload.mjs
npm run preview
```

Open http://127.0.0.1:8765/. Hash routes work beneath a GitHub Pages repository path.

* [Architecture audit and integration inventory](docs/ARCHITECTURE.md)
* [Verification and remaining device checks](docs/VERIFICATION.md)
* [Staging and production deployment plan](docs/DEPLOYMENT.md)
* [Approved original references](docs/design-references/README.md)
* [Six page screenshots](docs/screenshots/)

Only `dist/` is deployed. `scripts/verify-payload.mjs` rejects files outside the static allowlist and common credential patterns. `.github/workflows/staging.yml` checks and publishes this isolated staging repository only.

## Updating resource metadata

Vocabulary loads `published == true` from the existing public Firestore API. The frontend also excludes deleted/unpublished records. Units loads its already-public metadata index; it never queries the teacher-only Units collection. The public index may lag current edits and does not make full units public.

`dist/catalog.mjs` holds stable topic IDs and reviewed resource-to-topic associations. New or renamed resource IDs are searchable but receive no guessed topic tags until reviewed. Years come directly from source metadata; the mockups’ illustrative year chips are not data.

The approved illustrations are displayed by clipping unchanged PNG references inside SVG viewports. Text/navigation/cards are real responsive HTML; no screenshot is used as a full-page implementation. Actual vocabulary imagery remains owned by the existing library. Standalone original illustration assets can replace these clipped references later without changing the approved design.

## Latest approved visual revision

Year Levels uses the supplied illustrated staircase, with working Prep–Year 6 step links and smaller-screen shortcuts. All shared header/footer branding and the favicon use the supplied Yin-Yang emblem. These replace the earlier year-card layout and vertical seal; the other approved page designs and resource/data boundaries remain in place.
