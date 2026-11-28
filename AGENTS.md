# The Mandarin Room: Website Integration agent protocol

This file is the single shared protocol for every coding agent (Codex, Claude Code) and human working in this repository. `CLAUDE.md` imports this file, so the two cannot drift apart. Change the protocol here.

## 0. Shared standards (read first)

The Mandarin Room's shared standards live in the Vocabulary Library repository, which is the hub. They apply here too. Read [`docs/PROJECT_STANDARDS.md`](https://github.com/themandarinroom/vocabularylibrary/blob/main/docs/PROJECT_STANDARDS.md) before any task. It covers:
- principles and collaboration rules;
- environments and Staging/Production parity;
- the **risk-based approval policy**;
- reporting and evidence, the workspace map and operational knowledge;
- the index of owner documents.

Vocabulary data, IDs, pinyin, English, assets and audio are owned there (`docs/VOCABULARY_SET_CREATION.md`, `docs/ASSETS.md`, `docs/TOPICS.md`). This repository owns the website's architecture (`docs/ARCHITECTURE.md`), build and deployment (this file, §1–§7) and the **UI and design standard** (`docs/design-references/README.md`).

## 1. What this repository deploys

| Environment | Where | Deployed from | How |
|---|---|---|---|
| **Production** | themandarinroom.au (+ the-mandarin-room.web.app). Firebase Hosting site `the-mandarin-room`, project `the-mandarin-room` | a commit on **`production`** | `firebase deploy --only hosting --config firebase.hosting-default.json --project the-mandarin-room`, after explicit owner approval |
| Shared staging (GitHub Pages) | themandarinroom.github.io/website-integration-staging | `codex/unified-website-v1` | **automatically on any push to that branch** (`.github/workflows/staging.yml`) |
| Isolated staging previews | `the-mandarin-room-staging--<channel>.web.app` | any feature branch | `firebase hosting:channel:deploy <name> --expires 14d --project the-mandarin-room-staging` |

- **Payload:** `dist/` is the reviewed payload and is pinned to staging. `scripts/build-production.mjs` turns it into `build/production/`, rewriting staging references with exact match counts. **Never hand-edit `build/production/`.**
- **Public vocabulary data:** read anonymously and read-only from the **Production** Firestore by design, even in staging.

## 2. Production protection (non-negotiable)

1. **No Production change without explicit approval** from the owner. This covers Hosting deploys, Firestore/Storage data, rules, Functions, Auth settings, IAM and DNS. Approval for one action does not carry over to the next.
   - Website code and UI always need a separate approval after Staging verification.
   - Only narrowly scoped vocabulary content operations may be approved in advance (shared standards §5).
2. **`production` is the definitive Production source and GitHub's default branch.** It is protected: no force-push, no deletion, linear history, admins included. Never try to bypass or remove this protection.
3. **Keep the local push guard.** `remote.origin.pushurl` stays `PUSH-DISABLED-<date>`. After approval, push only by explicit URL: `git push https://github.com/themandarinroom/website-integration-staging.git <sha>:refs/heads/<branch>`. Never run `git config` to re-enable pushing.
4. **Never force-push, reset, rebase or delete** a shared branch, and never push to `codex/unified-website-v1` (that redeploys shared staging) without approval.
5. **Never weaken a safety check to make it pass.** That includes the `build-production.mjs` staging-reference guard, the `verify-payload.mjs` allowlist, the deploy guards and the tests. A failing guard is a finding to report, not an obstacle.
6. **Do not deploy Production from a dirty tree, an unpushed-only branch or a local-only commit** unless the release procedure below is followed in full.

## 3. Branching

- **Start all work from `origin/production`:** `git fetch origin && git switch -c <agent>/<topic> origin/production`. Use the prefix `claude/` for Claude Code and `codex/` for Codex.
- **One topic per branch.** Do not merge an old development branch wholesale. Bring in only specific reviewed commits (cherry-pick), then resolve each conflict individually.
- **Before starting,** check whether another agent's branch already contains related work: `git branch -r` and `git log origin/production..origin/<branch>`.
- **Before deploying anything,** confirm that live Production still equals a build of `origin/production`. If live contains changes that are not on `production`, stop and report.

## 4. Testing (required before any deploy, staging or Production)

```bash
npm test                                   # all tests/*.test.mjs; every failure must be explained
npm run check                              # syntax of every shipped module
node scripts/verify-payload.mjs            # dist/ allowlist; no backend, credentials or rules
node scripts/build-production.mjs <tmpdir> # must succeed before any Production release
```

- **New files:** add every new `dist/` file to both the `verify-payload.mjs` allowlist (and its file count) and the `npm run check` list when it is a module.
- **Regression tests:** add tests for new behaviour and for each conflict resolution.
- **Browser checks:** verify in a browser (desktop and phone width), and confirm there are no console errors.
- **Stay read-only on Production data:** never write to Production Firestore or Storage while testing. Staging test data must be clearly labelled (e.g. a `ZZ` prefix) and removed afterwards.
- **Cache-busting:** bump the `?v=` query on `app.mjs` / `styles.css` in `dist/index.html` when those files change.

## 5. Approval gates

Stop and ask the owner before:
- any Production deploy, or any change to Production data, rules, Functions, Auth or IAM
- any push to GitHub, or any change to repository settings or branch protection
- any change to shared staging infrastructure: staging Functions/CORS, staging rules, Auth authorised domains, or a push to `codex/unified-website-v1`
- adding Firebase permissions, billing or new services
- deleting data, objects or branches

Isolated staging preview channels and local testing need no extra approval when the task asks for staging verification.

## 6. Production release procedure

1. The reviewed feature branch is based on `origin/production`, its tests pass, and the owner has approved the release.
2. Verify live == a build of `origin/production` (all files byte-identical). If not, stop.
3. Build: `node scripts/build-production.mjs`. Confirm that only the expected files differ from live.
4. Deploy Hosting only, with the command in §1 and a release message naming the commit. The predeploy guard rebuilds and verifies.
5. Verify every live file is byte-identical to `build/production/` on themandarinroom.au **and** the-mandarin-room.web.app, then smoke-test Home, Vocabulary, Topics, Activities, About, Units Management, Journey and Unit publication.
6. Record the release. Fast-forward `production` to the released commit (explicit-URL push, no force) and push an annotated tag `production/<YYYY-MM-DD>-<hosting-release-hash>`. Update the release history below.
7. **Rollback:** Firebase console → Hosting → `the-mandarin-room` → Release history → roll back. Alternatively, rebuild and deploy the previous `production/*` tag.

## 7. Release history

| Date | Hosting release | Source commit | Change |
|---|---|---|---|
| 2026-11-28 | `58afa37fe2931016` | `66903c5` | Activities: fourth card **Vocabulary Games** (whole-card link, no arrow) and its page with **Tarsia Puzzle** (opens `themandarinroom.github.io/vocabularylibrary/tools/tarsia-puzzle/`, Vocabulary Library `e589848` / #9). Hosting only. All 57 files verified on both production domains. |
| 2026-11-27 | `626fde920169049c` | `f4f2d81` | Activities and Listening Games card arrows removed, Topics index heading simplified. Hosting only. All 55 files verified on both production domains. |
| 2026-11-26 | `4d312a0c5ff6a8e0` | `fa016d2` | Learning References: Numbers chart, anonymous enlarged/full-window viewing and printable PDF; reused original SVG/PNG/PDF assets; Hosting only |
| 2026-11-25 | `5b2c84` | `2d69017` | Topics v1.1: 13 topics (Social Interactions, 餐饮, Nature, Community) and multi-topic sets (with Vocabulary Library `56db84f`, Firestore rules `17af1788`, Production `publishPublicUnit` from `e399672`, data: How are you? → social-interactions, topicIds backfill, Age → Numbers + People) |
| 2026-11-25 | `4aa80c` | `69d0a58` | Topics restructure: 11 topics, membership from Vocabulary Library `topicId` (with Vocabulary Library `6fc48a2`, Firestore rules `3c3d85b4`, topic migration of 22 sets) |
| 2026-11-23 | `060baebe6e68aadd` | `d1b1e05` | Removed navigation arrows; full-card Home, Vocabulary and Topics links |
| 2026-11-22 | `909bc1` | `c90c040` | Activities: three cards; Listening Games page (Bingo, Build The Great Wall) |
| before 2026-11-22 | not recorded | `db8f33d` | Units Management card fixes (`a6c9941`, `db8f33d`); live was byte-identical to this build on 22 Nov. Hash: see Hosting release history |
| 2026-11-21 | `c64ec0` | `9aaa4a5` | Homepage redesign: watercolour hero, year-level cards, Teacher Login |
| 2026-11-18 | `cd0d03` | `6d2d8ca` | Vocabulary Set covers on website cards |
| 2026-11-18 | `738afa` | `71d7432` | Units Management responsive layout |
| 2026-11-15 | `238dad` | `8bbbf0c` | Bingo Games in Activities |
| 2026-11-08 | `ac2abb` | `c2e8edc` | Gate 4C-2A |

## 8. Related repositories (same rules apply)

- `themandarinroom/vocabularylibrary`: GitHub Pages from `main`. Production = live Pages build. Same push guard. Code releases go through squash-merged Pull Requests after approval; see its `AGENTS.md` §6–§7 (release history).
- `themandarinroom/units`, `themandarinroom/speaking`: GitHub Pages apps linked from this site. Do not change their base paths.
- Firebase Rules are owned by the Vocabulary Library repository root (shared standards §6; its `storage.rules` is known to be behind Production). For where the Functions source lives, see the shared standards' workspace map, §8. The staging project is `the-mandarin-room-staging`, the Production project is `the-mandarin-room`. Staging deploys must go through the staging guard (`guard-staging-deploy.cjs`), which refuses the Production project.

## 9. Agent-specific notes

Machine facts both agents need are in the shared standards §9: OpenJDK PATH, git identity, push URL and Firebase CLI.

- **Claude Code:** the browser pane cannot complete Google sign-in. Teacher-page tests that need sign-in go to the owner's Chrome.
- **Both agents:** `dist/` is pinned to Staging. Verify the built `build/production/` or the live files, never `dist/`, when making a claim about Production.
