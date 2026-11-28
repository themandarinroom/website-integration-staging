# Website architecture

**Current as of 28 Nov 2026** (`production` `4de9778`, Hosting release `58afa37fe2931016`). The October 2026 Phase A audit this file used to hold is in git history (`692508d`). The cross-project architecture overview is in the [shared standards](https://github.com/themandarinroom/vocabularylibrary/blob/main/docs/PROJECT_STANDARDS.md) §1.

## Shape

- **Static site, hash routes:** `dist/index.html` + `dist/app.mjs` (pages), `dist/routing.mjs` (routes and redirects), `dist/styles.css` and `dist/tmr-tokens.css` (design tokens).
- **Public pages:**
  - Home `#/`, with `?year=0–6` year cards linking to the Journey routes;
  - Vocabulary;
  - Units;
  - Activities `#/activities`, with `#/activities/listening-games` and `#/activities/vocabulary-games`;
  - Topics `#/topics?topic=<id>`;
  - Pinyin; Hanzi; About.
- **Teacher pages** (Google sign-in, active `authorizedTeachers` only):
  - `unit-management.html`, with `teacher-units/` and `unit-management*.{mjs,css}`;
  - `unit-publication.html`;
  - `journey-admin.html`;
  - `admin-session.mjs` handles sign-in.
- **Student Unit viewer:** `dist/unit-viewer/`, built by `scripts/build-student-viewer.mjs`.

## Data it reads

| Data | How | Notes |
|---|---|---|
| Published vocabulary sets | `public-data.mjs`: anonymous Firestore REST `runQuery` on `vocabularySets` with `published == true` and an explicit field `select`, `cache: 'no-store'` | Read-only, from **Production** even in Staging builds. Deleted and unpublished sets are filtered again in `catalog.mjs` |
| Topics | `catalog.mjs` `TOPICS` (a checked copy of the Vocabulary Library `js/topic-taxonomy.js`) | Membership comes from each set's `topicIds` (see `docs/TOPICS.md`) |
| Covers | Each set's `coverImage` (`https` only), with `object-fit: contain` | Topic illustrations are fixed site artwork (`TOPIC_ART`) |
| Units and Journey | Published Unit and Journey data. Teacher pages use the Firebase SDK with Auth | Unit publication uses the `publishPublicUnit` Function |
| Learning References | `learning-references.mjs` with assets in `dist/assets/learning-references/` | Anonymous viewing and printable PDF |

The games and tools (Word Randomiser, Bingo, Build the Great Wall, Tarsia Puzzle) are **not** in this repository. Activities links to them on `themandarinroom.github.io/vocabularylibrary/tools/…`. They are never iframed.

## Build and environments

- **Staging pin:** `dist/` is the reviewed payload, pinned to `the-mandarin-room-staging`.
- **Production build:** `scripts/build-production.mjs` writes `build/production/`. It rewrites every Staging reference with an exact expected match count, takes the public Firebase web config from the sibling `../vocabularylibrary/js/firebase-config.js`, and refuses leftovers.
- **Guards:**
  - `scripts/verify-payload.mjs` allowlists every shipped file;
  - `scripts/guard-hosting-default.mjs` and `guard-production-deploy.mjs` guard the deploy;
  - the Staging deploy guard `guard-staging-deploy.cjs` refuses the Production project. It is not in this repository; it lives in the shared workspace (for example `work/vocab-image-upload-staging/`).
- **Hosting:** Production is Firebase Hosting site `the-mandarin-room`, from `firebase.hosting-default.json`, `public: build/production`.
  - Its headers include `Permissions-Policy: camera=(), microphone=(), …`, `X-Frame-Options: DENY` and `frame-ancestors 'none'`, so the site cannot record audio or be framed.
  - Staging previews use channels on `the-mandarin-room-staging` (`firebase.*-staging.json`).
- **Legacy GitHub Pages staging:** `codex/unified-website-v1` deploys automatically through `.github/workflows/staging.yml`. It lags Production; do not push to it without approval.
- **Deployment procedure and release history:** [AGENTS.md](../AGENTS.md) §6–§7.

## Security boundaries (unchanged since Phase A)

- The site adds no new identity system and no student sign-in.
- Teacher access is Google sign-in plus `authorizedTeachers`.
- The public site never enumerates teacher-only collections, Units drafts or saved Speaking practices.
- Firebase Rules are owned by the Vocabulary Library repository (shared standards §6). This repository holds no rules files.
- Known accepted limitations recorded in Phase A remain: public `get` of known vocabulary IDs, and shallow Unit lesson validation. Changing them needs a separately approved Rules change.

## Deferred and unreleased work

- **Feedback & Comments:** deferred. Branch `claude/feedback-reconcile`, tag `archive/feedback-reconcile-2026-11-19`.
  - Rebuild it on the latest `origin/production` before any release.
  - Production requirements are in that branch's `docs/FEEDBACK-RELEASE-STATUS.md`.
  - Its backend source is not yet committed (shared standards §8).
- **Pinyin initials chart:** branch `claude/pinyin-initials-on-topics-v1.1`. `build-production.mjs` keeps `INITIALS_CHART_AVAILABLE = false` until it is released.
