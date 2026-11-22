# The Mandarin Room: Website Integration agent protocol

This file is the single shared protocol for every coding agent (Codex, Claude Code) and human working in this repository. `CLAUDE.md` imports this file, so the two cannot drift apart. Change the protocol here.

## 1. What this repository deploys

| Environment | Where | Deployed from | How |
|---|---|---|---|
| **Production** | themandarinroom.au (+ the-mandarin-room.web.app). Firebase Hosting site `the-mandarin-room`, project `the-mandarin-room` | a commit on **`production`** | `firebase deploy --only hosting --config firebase.hosting-default.json --project the-mandarin-room`, after explicit owner approval |
| Shared staging (GitHub Pages) | themandarinroom.github.io/website-integration-staging | `codex/unified-website-v1` | **automatically on any push to that branch** (`.github/workflows/staging.yml`) |
| Isolated staging previews | `the-mandarin-room-staging--<channel>.web.app` | any feature branch | `firebase hosting:channel:deploy <name> --expires 14d --project the-mandarin-room-staging` |

- **Payload:** `dist/` is the reviewed payload and is pinned to staging. `scripts/build-production.mjs` turns it into `build/production/`, rewriting staging references with exact match counts. **Never hand-edit `build/production/`.**
- **Public vocabulary data:** read anonymously and read-only from the **Production** Firestore by design, even in staging.

## 2. Production protection (non-negotiable)

1. **No Production change without explicit approval** from the owner in the current conversation. This covers Hosting deploys, Firestore/Storage data, rules, Functions, Auth settings, IAM and DNS. Approval for one action does not carry over to the next.
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
| 2026-11-22 | `909bc1` | `c90c040` | Activities: three cards; Listening Games page (Bingo, Build The Great Wall) |
| before 2026-11-22 | not recorded | `db8f33d` | Units Management card fixes (`a6c9941`, `db8f33d`); live was byte-identical to this build on 22 Nov. Hash: see Hosting release history |
| 2026-11-21 | `c64ec0` | `9aaa4a5` | Homepage redesign: watercolour hero, year-level cards, Teacher Login |
| 2026-11-18 | `cd0d03` | `6d2d8ca` | Vocabulary Set covers on website cards |
| 2026-11-18 | `738afa` | `71d7432` | Units Management responsive layout |
| 2026-11-15 | `238dad` | `8bbbf0c` | Bingo Games in Activities |
| 2026-11-08 | `ac2abb` | `c2e8edc` | Gate 4C-2A |

## 8. Related repositories (same rules apply)

- `themandarinroom/vocabularylibrary`: GitHub Pages from `main`. Production = live Pages build. Same push guard. Fast-forward only, after approval.
- `themandarinroom/units`, `themandarinroom/speaking`: GitHub Pages apps linked from this site. Do not change their base paths.
- Firebase backends (rules, Functions) live in the Vocabulary Library workspace. The staging project is `the-mandarin-room-staging`, the Production project is `the-mandarin-room`. Staging deploys must go through the staging guard (`guard-staging-deploy.cjs`), which refuses the Production project.
