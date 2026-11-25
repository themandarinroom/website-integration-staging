# Topics page (restructured 24 November 2026; taxonomy v1.1 on 25 November 2026)

## Taxonomy
`dist/catalog.mjs` defines `TOPICS`, the 13 approved topics (v1.1) in display order: Numbers, Colours, People, Animals, Social Interactions (社交), Food & Drinks (餐饮), School, Free Time, Countries, Time & Weather, Culture, Nature (自然) and Community (社区). Greetings was replaced by Social Interactions; old `?topic=greetings` links redirect.

- The canonical list is `js/topic-taxonomy.js` in the Vocabulary Library.
- `tests/topics-restructure.test.mjs` fails if the IDs, order, English or Chinese titles, or descriptions differ. Set `VOCABULARY_LIBRARY_DIR` to point the test at a checkout. By default it looks for the sibling folder `../vocabularylibrary-topics`, then `../vocabularylibrary`.

## Membership (dynamic)
- **Where membership comes from:** a vocabulary set belongs to the topic in its own `topicId` field.
  - `public-data.mjs` reads it with the existing anonymous published-sets query (`cache: 'no-store'`), so a normal refresh shows Vocabulary Library changes.
  - There is no hand-maintained set-to-topic map. Membership is never inferred from a set's ID or title.
- **Year badges:** derived from the published sets in each topic.
- **Topic page order:** a topic page (`#/topics?topic=<id>`) lists its sets with the Vocabulary page cards. They are sorted by year (Prep first), then by set ID, which is the Vocabulary page order and gives I, II, III within a series. Units come after vocabulary within the same year.
- **Units:** published student Units appear in their topics. Units published before v1.1 may carry retired IDs; `currentTopicIds()` and the student viewer map them (`family`, `body-parts` → `people`; `food` → `food-drinks`; `weather`, `time` → `time-weather`; `greetings` → `social-interactions`).
- **Unit publication:** offers the same 13 topics. The `publishPublicUnit` Function (v1.1) accepts the 13 IDs and stores any retired ID it receives as its replacement.
- **Old links:** links such as `#/topics?topic=family` redirect to the new topic.

## Illustrations (fixed)
`TOPIC_ART` in `dist/app.mjs` maps each topic to one artwork. It never follows a vocabulary set's cover.

| Topic | Artwork |
|---|---|
| Numbers, Colours, Animals, School, Countries (globe), Culture | Their existing sprite artwork in `assets/topic-covers-transparent.png` |
| Food & Drinks | The old Food artwork |
| People | The old People artwork (four friends) |
| Social Interactions | `assets/topic-social-interactions.png` (two children shaking hands) |
| Free Time | `assets/topic-free-time.png` (child on a bicycle) |
| Time & Weather | `assets/topic-time-weather.png` (clock and rain cloud) |
| Nature | `assets/topic-nature.png` (watercolour landscape) |
| Community | `assets/topic-community.png` (watercolour community scene) |

- **New files:** the five supplied PNGs are the owner's transparent RGBA artwork. The three v1.1 files were losslessly re-encoded (pixels verified identical). They are framed in the browser on their artwork bounds, like the sprite.
- **Cards without a saved cover:** `SET_FALLBACK_ART` keeps the artwork these Vocabulary cards showed before the restructure (Numbers 0-10, Body Parts, Family, Age).
