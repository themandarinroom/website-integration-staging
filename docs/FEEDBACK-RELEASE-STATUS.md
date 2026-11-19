# Feedback & Comments: release status (DEFERRED)

**Decision (owner, 19 Nov 2026):** the Production release of Feedback & Comments is **deferred**.

The complete implementation is preserved on branch `claude/feedback-reconcile`. Do not merge it, deploy it or change Firebase for it without new explicit approval. Follow `AGENTS.md` (on `production`).

## 1. Where everything is

| What | Where |
|---|---|
| Website implementation | branch `claude/feedback-reconcile`. Reconciled commit `a10d0c6` (cherry-pick of `8887890` onto Production `6d2d8ca`), plus this documentation |
| Original unreleased commit | `8887890` on `codex/unified-website-v1` (shared staging line; also carries the duplicate Bingo commit `af08a09`) |
| Backend source snapshot | `docs/backend-snapshot/feedback-2026-11-15/`. See §4: **the backend source is not committed in any other repository** |
| Test and staging evidence | `docs/evidence/feedback-reconcile-2026-11-19/` |
| Functional and moderation documentation | `docs/FEEDBACK.md` |
| Deployed staging backend | Firebase project `the-mandarin-room-staging`, `australia-southeast1`: `submitFeedback`, `listPublicFeedback`, `moderateFeedback` |

The staging preview `the-mandarin-room-staging--feedback-reconcile-7tk37q1d.web.app` **expires on 3 Dec 2026**. Nothing depends on it: everything it showed can be rebuilt from this branch (§6).

## 2. ⚠ Required before any future release: rebuild on `production`

This branch was cut from `production` at `6d2d8ca`. `production` has since advanced (`e317aee` adds `AGENTS.md`/`CLAUDE.md`) and will keep moving. **Before any release, rebuild the feature on the latest protected `production`:**

```bash
git fetch origin
git switch -c claude/feedback-release origin/production
git cherry-pick a10d0c6        # the reconciled feedback commit only
# do not cherry-pick the protocol commit (already on production) or these docs unless wanted
```

After that:
1. Resolve any new conflicts individually (see §5 for how the original four were resolved).
2. Re-run all tests.
3. Confirm the live site == a build of `origin/production` before deploying.

Never merge `codex/unified-website-v1` or this branch wholesale into `production`.

## 3. Outstanding Production requirements (all need explicit approval)

### Backend (Firebase project `the-mandarin-room`)

1. **Deploy the three Functions:** `submitFeedback`, `listPublicFeedback`, `moderateFeedback` (Node 22, `australia-southeast1`).
   - In `functions/index.js`, feedback is currently exported **only for staging projects** (inside `if (isStagingLiveSessionProject)`). A deliberate, reviewed Production export is needed.
2. **CORS:** the allowlist is currently `https://themandarinroom.github.io` and `http://(127.0.0.1|localhost):8765`. Production needs `https://themandarinroom.au`. Also decide on `https://the-mandarin-room.web.app` (`www` redirects to the apex).
3. **Dedicated rate-limit secret:** the staging handler reuses `LIVE_SESSION_TOKEN_PEPPER`. Provision a separate Production Secret Manager secret and update `defineSecret`.
4. **Firestore rules:** add explicit deny rules for `feedbackSubmissions`, `publicFeedback` and `feedbackRateLimits` to the **canonical Production ruleset**. First retrieve the currently deployed Production rules and record their release ID. Do not deploy a stale local rules file.
5. **Admin allowlist:** confirm the Production `authorizedTeachers/{uid}` records (active, verified email) for every moderator.
6. **Cleanup:** add a TTL policy or scheduled cleanup for `feedbackRateLimits`, which currently have an expiry field but no automatic cleanup.
7. **Billing and quotas:** Functions invocations and Firestore operations, plus abuse limits. The current limits are 10 accepted submissions per source per 10 minutes and 120 shared per window. Schools sharing one internet address may hit the per-source limit.

### Website build

8. **Production rewrites:** add explicit rewrites with exact match counts to `scripts/build-production.mjs`. Today the guard (correctly) refuses to build:

   | File | Staging reference | Count |
   |---|---|---|
   | `feedback.mjs` | `australia-southeast1-the-mandarin-room-staging.cloudfunctions.net` | 1 |
   | `index.html` | the same Functions host in the CSP `connect-src` | 1 |
   | `feedback-admin.html` | the same Functions host (CSP) | 1 |
   | `feedback-admin.html` | `https://the-mandarin-room-staging.firebaseapp.com` | 2 |

   `admin-session.mjs` is already rewritten by the existing rules.
9. **Noindex:** add `feedback-admin.html` to the teacher-page noindex handling: the `X-Robots-Tag` header pattern in `firebase.hosting-default.json`, the matching check in `scripts/guard-hosting-default.mjs`, and the teacher-page list in `build-production.mjs`.
10. **Robustness:** clamp `rating` to 0–5 in `feedbackCard()` on the client. Today it would throw on out-of-range data; the server already validates.

### Governance and acceptance

11. **Privacy review:** public display of names, ratings and comments; private email; retention and deletion policy; the student-safety moderation policy. Update the Privacy dialog wording if needed.
12. **Acceptance on Production:** use synthetic entries only and delete them afterwards. Complete the manual checklist in `docs/FEEDBACK.md`, including physical iPad/Safari.
13. **Still untested:** "Load more" pagination (needs more than one page of entries) and admin display of a supplied private email.

## 4. Backend source preservation (important)

The backend source was found **only as uncommitted files** in the local `ChatGPT/The Mandarin Room` workspace (`functions/feedback.js`, `functions/feedback.emulator.test.js`, the export in `functions/index.js`, the rules in `firestore.staging.rules`). It is not in any git repository.

To keep it recoverable, this branch holds a **read-only snapshot** in `docs/backend-snapshot/feedback-2026-11-15/`:
- the two source files, copied unchanged
- excerpts of the `index.js` export and the staging deny rules
- `SOURCE-SHA256.txt`, the checksums of the originals

The snapshot contains no secret values, only the secret's *name*. That workspace was not modified. **Recommendation:** commit the backend source to the canonical Functions repository in a separately approved task. The snapshot is not a deploy source.

## 5. Conflict resolution (reconciliation of `8887890` onto `6d2d8ca`)

- **`dist/index.html`:** kept the Production CSP and markup; added only the staging Functions host to `connect-src`; combined cache versions `?v=feedback-reconcile-1`.
- **`dist/styles.css`:** kept Production's `.library-actions` and appended all 24 feedback rules.
- **`package.json`:** union of the `check` lists, keeping Production's `publication-model.mjs`.
- **`scripts/verify-payload.mjs`:** kept Production's optional payload-folder argument (used by the deploy guard) and the Units Management allowlist; added the 3 feedback files; count 40 → 43.
- **Auto-merged and reviewed:** `dist/app.mjs` (the vocabulary covers, Units, Journey and Bingo code is intact), `dist/admin-session.mjs`, and two test files.
- **Not taken:** `af08a09`, which duplicates Production's `8bbbf0c`.

## 6. Verification record (19 Nov 2026)

**Automated:**
- `npm test`: **72/73 pass**. The only failure is `production-build.test.mjs`, the intended release gate (`production-build-guard.txt`).
- `npm run check`: pass.
- `verify-payload`: 43 files, pass.

**Live staging backend**, from the CORS-allowed origin `http://localhost:8765`:
- **Public visitor:** the About form renders; validation refuses empty submissions and emails in the public comment; 3 rapid submits sent 1 request, which was accepted; a pending entry stays private.
- **Signed-in staging admin:** approve made the entry public, with no email in the public data; reject retracted it; delete with Cancel kept it and with OK removed it.
- **Signed-out access:** the moderation page is refused, and an anonymous moderation call returns 403.
- **Cleanup:** the synthetic entry was deleted, and staging feedback is empty.
- **Screenshots:** in `screenshots/`.

**Staging preview:** from the preview origin, feedback calls are blocked by the Functions CORS allowlist, as expected. The page degrades gracefully.

**How to recreate the preview after expiry** (staging only):

```bash
git switch claude/feedback-reconcile
mkdir -p /tmp/fb/public && cp -R dist/. /tmp/fb/public/
# firebase.json: {"hosting":{"site":"the-mandarin-room-staging","public":"public"}}
firebase hosting:channel:deploy feedback-reconcile --expires 14d --project the-mandarin-room-staging
```

For a live backend test, serve `dist/` at `http://localhost:8765`: `npm run preview` uses that port.
