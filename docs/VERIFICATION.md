# Verification — 26 October 2026

## Automated checks

* `npm run check`: all three browser modules parse successfully.
* `npm test`: 14/14 pass. Covers published/deleted boundaries, metadata validation, no guessed topic/year mapping, bilingual search, safe URL handling, Unit public-index contract, typed Firestore decoding, anonymous no-cache reads, Teacher Voice identity/host boundaries, six navigation entries, unavailable contact form, and absence of Firebase writes/tracking/storage.
* `node scripts/verify-payload.mjs`: 12 allowlisted static files; no backend, rules, credentials or unapproved files.
* Existing application test suites: 39/39 pass, including Word Randomiser random engine, live sessions/security, staging cache, QR/student UI; Speaking saved practice/Pinyin input; Units deep links and metadata index. Output: existing-tests.txt. No production cloud acceptance suite was run because those can create data.

## Browser checks

Chrome browser, live anonymous public data; viewport simulation is not physical iPad/Safari testing.

* All six pages rendered at desktop 1536×1000, tablet 810×1080 and mobile 375×812. Each page had exactly one main H1 and the correct active navigation item; no document horizontal overflow at any of these 18 checks.
* Home shows Vocabulary, Units and Activities only, with six image-bearing published vocabulary cards; no Explore by Year Level section.
* Verified 9 published Vocabulary sets and 2 public Unit metadata previews. No Unit cloud collection or saved Speaking practice collection is queried.
* Topic search `animal` reduced to Animals. Opening it showed exactly Pets I/Pets II under the actual Year 1 metadata. Empty topics show Coming soon, not fabricated resource cards.
* Selecting Prep showed Numbers 0–10 and correct Prep Speaking/Word Randomiser links. Unit absence was explicit.
* Global search `国家` returned Countries I. Search terms are not stored, tracked or sent to a search service; the route fragment can retain a shareable query locally in the URL.
* Teacher Voice for 狗 reached the real `Playing Teacher Voice: 狗` playback state. AI Voice for 狗 reached its finished state. No browser error/warning logs were present in that check. This is functional playback evidence, not an acoustic pronunciation assessment.
* Admin dialog offers only existing protected app entries; Escape closed the dialog and restored focus to Admin. Contact inputs and Send Message are disabled. Planned activities have no misleading launch control.
* Desktop screenshots of all six pages and additional tablet/mobile views are in screenshots/. About mobile text/illustration overlap was found and corrected before final capture.
* Original production app entry URLs and separate randomiser staging URL returned HTTP 200. Entry availability does not establish full authorised workflows or live backend readiness.

## Manual/device acceptance still required

* Seventh-generation school iPad on the actual installed iPadOS/Safari and school network: Teacher Voice playback for each needed recording, AI Voice failure behaviour, reload, orientation, background/foreground, and tap interactions. The shell uses ordinary HTML audio from the existing cloud recordings and keeps AI independent; a device without AI must use an available Teacher recording. No recording is invented when absent.
* Existing Word Randomiser local draws and staging live join/delegated/group workflows across real teacher/student devices. Live production backend is not deployed; its staging entry is clearly labelled.
* Existing Speaking microphone permissions, Core/Challenge temporary recording, independent Teacher/AI audio, and device-local recording clearance on reload. No student recordings were uploaded by this work.
* Authorised/unauthorised Admin access and editing on the existing apps. No account sign-in, editing or saving was performed by these browser checks.
* Safari/VoiceOver and school managed-browser accessibility checks, including keyboard focus, text zoom and Chinese/Pinyin pronunciation by a screen reader. Automated contrast certification and a full WCAG audit were not performed.
* Review publicly indexed Units with the owner: the index is a published metadata snapshot dated 4 September 2026; it may lag current cloud edits. Full anonymous units remain blocked by the existing access model.
* Native third-party translation overlays may appear in local browser screenshots; those controls are not part of the integration frontend.

## Acceptance limits

This delivers a safe Phase 1 integration shell. It does not claim full app embedding, public Unit content, a complete Pinyin course/chart/audio bank, Hanzi stroke animations, new games, email delivery, analytics, production live sessions, or a configured custom domain. Those are preserved existing workflows, explicit placeholders or documented follow-up decisions. Existing production security/rule limitations are recorded in ARCHITECTURE.md and left unchanged.
