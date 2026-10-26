# Staging and production deployment

## Isolated staging

New repository: https://github.com/themandarinroom/website-integration-staging

Source branch: `codex/unified-website-v1`.

Verified live Pages URL: https://themandarinroom.github.io/website-integration-staging/

The only deployable directory is `dist`. No existing production repo, Pages configuration, Firebase environment or application file participates. Public production resources are read anonymously; the shell has no write operations. Only approved public metadata and media are loaded. Live Word Randomiser links explicitly enter its existing staging environment.

The staging repository contains no CNAME file, redirects from production, DNS scripts, Firebase deploy config, backend or security rules. Robots/noindex discourage indexing but are not access control; this is an intentionally public preview containing public resources only.

The GitHub Pages workflow verifies syntax, boundary/filter tests and the static payload before deploying. It uses GitHub’s supported [custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Anonymous Vocabulary preview uses Firestore’s read-only [runQuery REST endpoint](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runQuery). A POST to that endpoint executes a query, not a data mutation.

For rollback, redeploy a previously accepted commit in this staging repository. Existing app links and production deployments remain unaffected.

## Production plan — separate approval required

1. Review the staging design, links and source. Complete the manual classroom/device checklist in VERIFICATION.md. Verify chosen resources and metadata accuracy with the resource owner.
2. Decide the public Units publishing model. Current Units cloud documents are teacher-only. Do not loosen rules or expose notes/worked examples to fill the homepage. Obtain explicit approval for any future publishing fields/rule changes; test in an isolated Firebase environment first.
3. Choose the production static host/repository for themandarinroom.au. Keep existing `/vocabularylibrary`, `/units`, `/speaking` and Word Randomiser URLs operational. Phase 1 can retain canonical external app links. Do not change their base paths or iframe them without testing auth, audio, CSP and iPad behaviour.
4. Configure HTTPS and domain ownership in the chosen host only after production approval. Prepare a reviewed DNS change list for GoDaddy/Cloudflare. Do not change DNS as part of staging. Add CNAME/custom-domain config only at that approved step.
5. If Admin authentication is later moved into the new shell/domain, review Firebase authorised domains, redirect origin, browser persistence and allowlist handling. The current shell keeps auth in existing apps and needs no Firebase authorised-domain changes.
6. Contact delivery remains disabled until a separately reviewed backend has email delivery, server validation, field length limits, email/header injection protections, spam controls, rate limits, safe logging, a retention/deletion policy and tested error handling. Confirm control of info@themandarinroom.au before enabling delivery. Do not place mail credentials in static assets.
7. Analytics remains deferred: review school/student privacy, consent and data retention first. Any later event vocabulary should use page/route, topic ID, year level and public resource ID only. Do not send search text, student names, recordings or persistent student identifiers. Do not derive unique users solely from IP addresses or add advertising trackers.
8. After approval, deploy the same verified static payload to the selected production host, verify SSL/routes/public data/audio, then remove staging-only noindex/preview labels from that production build. Retain this staging site for future changes.
9. Monitor links and published resource changes with a separately authorised process; no recurring monitor or tracking has been enabled by this task.

No production migration, DNS, Firebase security rule or destructive data changes were performed.

## Verified release

Initial deployed source commit: `692508d8ff5994ea91a9607b8c2d230a7acb766c`.

[GitHub Actions deployment](https://github.com/themandarinroom/website-integration-staging/actions/runs/40257456004) completed successfully after adding the exact integration branch to this new repository’s default Pages branch allowlist. No existing repository environment was changed.

All 11 publicly served static files returned HTTP 200 and matched local SHA-256 content exactly (`.nojekyll` is a deployment marker, not a served asset). See deployment-http-checks.json. The live browser loaded six actual image cards and two Unit metadata previews without console warnings/errors; staging-home.png records the deployed page. Existing Vocabulary, Units, Speaking and Word Randomiser entries returned HTTP 200 again after staging deployment.

Subsequent documentation/screenshot commits do not change the verified static content.
