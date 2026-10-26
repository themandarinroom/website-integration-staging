# Staircase homepage promotion — staging verification

Date: 26 October 2026 (Australia/Melbourne).

## Result

The approved Year Levels staircase is now Home. The original PNG is unchanged: seven pastel steps, diverse children, plants, clouds and the full composition are reused. Only its embedded title/subtitle region is clipped in SVG and filled from an adjacent empty sky strip, allowing responsive HTML to display **Welcome to The Mandarin Room** and **Explore Mandarin through vocabulary, lessons and activities.** No illustration was generated or recreated.

Navigation: **Home | Vocabulary | Units | Activities | Topics | Pinyin | Hanzi | About**, with Search and Admin retained on the right. The independent Year Levels tab and renderer are removed. `#/year-levels` is only a compatibility alias and is replaced with `#/`, preserving query parameters without an extra history entry.

All seven year links use `#/?year=0` through `#/?year=6`. The selected year’s published Vocabulary, public Unit previews and existing activity channels remain available below the scene. Their dedicated resource-page actions preserve the selected year.

Vocabulary now has its own real published catalog, year/topic filters, bilingual search and matching AI/Teacher Voice previews. Units has its own filtered public title/lesson index and existing protected viewer links. No full cloud Unit content or private teaching notes are exposed. Activities has verified Word Randomiser and Speaking links, a separately labelled live-staging entry, and non-clickable Coming soon cards for Bingo and Listening Game.

## Automated verification

* Integration tests: **18/18 pass**, including existing public-data/security/filter checks plus root routing, legacy redirects with all seven years, all eight top-level routes and safe filter serialization.
* Existing app tests: **39/39 pass** across Word Randomiser, Speaking and Unit Library. No cloud data-writing acceptance suites were run.
* JavaScript syntax: four modules pass `npm run check`.
* Deployment allowlist: **14 static files**; no backend, rules, credentials or unapproved files.

Outputs: homepage-integration-tests.txt, homepage-existing-tests.txt.

## Browser verification

Chrome with anonymous public resource reads:

* **24 layout checks**: all eight pages at desktop 1536×1000, tablet 810×1080 and mobile 375×812. All checks had eight navigation entries, the correct active tab, one main H1, a loaded Yin-Yang logo and no document horizontal overflow. Small-screen navigation and the staircase intentionally scroll inside their own regions.
* All seven Home steps opened the correct year heading, kept Home active and moved keyboard focus to the resource heading. The mobile Year 6 shortcut also worked.
* Bare `/` and `/#/` display the staircase Home. Bare legacy `#/year-levels` redirected to `#/`. Legacy `#/year-levels?year=5` redirected to `#/?year=5`, showing Year 5 resources.
* Back from the redirected Home restored the previous Units year filter; Forward returned to Home with Year 5 retained.
* Vocabulary Year 1 returned 3 sets; adding Animals returned 2. Back restored Year 1/all topics/3 sets; Forward restored Animals/2 sets. A `国家` search returned Countries I and retained focus in the search field after submission.
* Both Teacher Voice and AI Voice for 狗 reached actual playback states from the new Vocabulary page. Audio remains independent, with existing Teacher recordings available when AI is unsupported.
* Units Year 5 returned the Countries preview and its existing Introduction lesson title. The dialog retained the original full-viewer access explanation and canonical Unit URL.
* Activities has exactly two deployed production application entries plus the explicit live-staging entry. Bingo and Listening cards have no launch links/buttons.
* Admin dialog opens and Escape closes it. Existing authentication remains in the original apps; no sign-in or saving was performed.
* Read-only URL checks returned HTTP 200 for Vocabulary, Units, the public Unit index, Speaking, Word Randomiser and the separate live-staging frontend. This verifies frontend availability, not a new production live-session backend.

Evidence: homepage-browser-checks.json, homepage-app-link-checks.json and screenshots/homepage-promotion/.

## Boundaries and remaining physical-device checks

Only the independent website-integration-staging repository is published. Existing production repositories, Firebase data/Storage/rules/Functions, authentication, Specialist Planner and DNS are unchanged. Public Units remain metadata previews until a separately approved publishing/access model exists. Existing placeholder Pinyin/Hanzi content and contact delivery stay visibly unavailable where unfinished.

Viewport checks do not substitute for physical school-iPad/Safari, microphone, VoiceOver or managed-network testing. Those existing manual acceptance items remain in VERIFICATION.md. No new analytics or student-identifying storage has been added.
