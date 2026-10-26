# Phase A — architecture audit and implementation plan

Audit date: 26 October 2026 (Australia/Melbourne).

## Isolation

The parent checkout is vocabularylibrary/main with substantial pre-existing uncommitted work and nested Speaking/Units repositories. Do not reset, stage, move, or publish it. All integration work lives in website-integration, an independent staging source directory. No existing application source, Firebase config, rules, Functions, data, Storage, DNS, or production deployment will be changed.

## Application inventory

| Application | Repository | Verified public entry | Integration |
|---|---|---|---|
| Vocabulary Library | themandarinroom/vocabularylibrary | https://themandarinroom.github.io/vocabularylibrary/ (HTTP 200) | Published-only, anonymous read preview; canonical student deep links. |
| Units | themandarinroom/units; local units-repository | https://themandarinroom.github.io/units/ (HTTP 200) | Public metadata index only; existing viewer remains permission restricted. |
| Speaking | themandarinroom/speaking | https://themandarinroom.github.io/speaking/student.html (HTTP 200) | Student entry with existing published year channels. |
| Word Randomiser | tools/word-randomizer inside vocabularylibrary | https://themandarinroom.github.io/vocabularylibrary/tools/word-randomizer/ (HTTP 200) | Existing Local Mode; live cloud capability remains staging only. |
| Live Word Randomiser staging | themandarinroom/word-randomiser-staging | https://themandarinroom.github.io/word-randomiser-staging/tools/word-randomizer/ (HTTP 200) | Explicit staging link; never present production live mode as deployed. |
| Bingo / Listening Game | No implemented apps located | None | Coming soon. |

Repository inventory verified with authenticated GitHub CLI. Public URLs checked using read-only HTTP requests. This verifies page availability, not every classroom workflow.

## Services, ownership and boundaries

The three production applications use the-mandarin-room Firebase; Word Randomiser live staging uses the-mandarin-room-staging. Audit source: root and product READMEs, public Firebase web configurations, root firestore.rules/storage.rules, runtime bootstrap, authoritative rule notice, Functions exports.

* Authentication: existing Google sign-in and active authorizedTeachers allowlist; no student sign-in or open registration added. Admin links to existing protected editors, not a new identity system. Same-origin hosting does not imply shared Firebase Auth persistence between different app installations.
* Vocabulary: vocabularySets list requires published == true for anonymous readers. Exclude deleted and unpublished results again in the new frontend. vocabularyTeacherVoices supports public document get, not collection enumeration. Teacher Voice Storage paths retain independent audio; browser speech synthesis remains AI Voice. Root Functions contains authenticated image generation and a unit metadata index; live-session exports are staging guarded.
* Speaking: speakingState year pointers and published legacy yearLevels support public students; saved practices can be public by known ID when not deleted, while listing is teacher restricted. The integration does not enumerate practices or expose saved drafts.
* Units: units collection is teacher-only and has no public/published model. Its existing viewer can show local sample fallback to anonymous visitors. Do not promise its public page contains the indexed cloud unit. Preview only the already-public metadata index (titles, IDs, year and lesson titles/counts); label viewer access limitations. No cloud units query and no worked-example downloads.
* Storage: Vocabulary images and Teacher Voice, Speaking teacher recordings, Units worked examples remain in their existing buckets and paths. No copies, migrations or writes.
* Specialist Planner is a separate product. Units owns a one-way public metadata index consumed by Planner; no Planner workspace is necessary for integration. Do not inspect, migrate or modify Planner data or environments.
* Root production rules remain authoritative. Existing risks include public get of known Vocabulary IDs, non-deleted saved Speaking practices readable by ID, shallow Units lesson validation, and worked-example download URLs. The shell does not expand these exposures; remediation requires a separate approved rules change.

## Design contract

Reviewed all six original PNGs and design-references/README.md in the Desktop project. Match white background, green vertical 中文 seal, navy typography, muted blue secondary text, pastel cards, modest radii/shadows, spacious header and consistent footer. Home retains three feature columns with vocabulary mini cards, year-tabbed unit metadata and four activity tiles. Year Levels has seven English pastel cards. Topics has banner/search and twelve cards. Pinyin/Hanzi use wide banners and six cards. About preserves bilingual panels and clearly disabled contact form. Use Admin and the full six-link navigation everywhere. Do not copy illustrative year mappings, lesson counts or unavailable features from mockups.

## Plan before implementation

1. Create independent integration/staging source, leaving the dirty parent checkout untouched.
2. Build six static, responsive hash-route pages with shared header/footer, accessible search, year/topic filtering, Admin dialog and clearly unavailable planned content. Hash routes work under a GitHub Pages subdirectory without server rewrites.
3. Read only published Vocabulary through anonymous Firestore REST queries; fetch public Unit metadata using HTTPS. No Firebase SDK/auth/write surface in the shell. Never persist curriculum data locally. Validate years, URLs and text before rendering. Topic associations require reviewed metadata; unmatched sets remain searchable without invented tags.
4. Preserve canonical application routes and independent audio controls, including ordinary Teacher Voice audio playback for older iPads. No embedded rewrites or iframes.
5. Run automated contract/security/filter tests, browser QA on desktop/tablet/mobile, and capture six page previews. Document physical-iPad and authorised-account testing gaps.
6. Publish only an allowlisted static payload to a NEW GitHub Pages staging repository if access permits. Keep existing repositories/deployments unchanged. Record actual deployment status.
7. Production later requires separate approval, unit publishing/access decisions, domain/SSL and Firebase authorised-domain planning, then manual acceptance. No DNS or production changes in this task.
