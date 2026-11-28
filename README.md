# The Mandarin Room: website

The public website at **themandarinroom.au** (also the-mandarin-room.web.app).
- **Public pages:** Home, Vocabulary, Units, Activities (Listening Games, Vocabulary Games), Topics, Pinyin, Hanzi and About.
- **Teacher pages:** Units Management, Unit publication and Journey admin.

It is static: hash-routed pages built from `dist/`, deployed to Firebase Hosting.

**Start here:**
- [AGENTS.md](AGENTS.md): environments, protection, branching, required tests, the Production release procedure and release history. Every agent and contributor reads this first.
- [Shared standards](https://github.com/themandarinroom/vocabularylibrary/blob/main/docs/PROJECT_STANDARDS.md) (Vocabulary Library repository): principles, collaboration rules, approvals, reporting and workspace map.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the site is built and what it reads.
- [docs/design-references/README.md](docs/design-references/README.md): the UI and design standard, and the approved decision log.
- [docs/TOPICS.md](docs/TOPICS.md): the Topics pages.
- [docs/VERIFICATION.md](docs/VERIFICATION.md): the browser and device checklist.

## Local preview and checks

Requires Node 22+ and Python 3. There are no npm dependencies.

```sh
npm run check                              # syntax of every shipped module
npm test                                   # tests/*.test.mjs
node scripts/verify-payload.mjs            # dist/ allowlist
node scripts/build-production.mjs <tmpdir> # Production build (needs a sibling vocabularylibrary checkout)
npm run preview                            # serves dist/ (Staging-pinned) at http://127.0.0.1:8765/
```

`dist/` is pinned to Staging. `build-production.mjs` produces the Production payload. See [AGENTS.md](AGENTS.md) §1.

## History

The earlier October 2026 documents (the GitHub Pages integration shell, staircase homepage and Phase A audit) are kept in git history.
- [docs/HOMEPAGE_PROMOTION.md](docs/HOMEPAGE_PROMOTION.md) and the evidence files under `docs/` are historical records.
- Newer task evidence lives in the shared workspace (shared standards §7).
