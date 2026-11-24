# Topics page (restructured 24 November 2026)

## Taxonomy
`dist/catalog.mjs` defines `TOPICS`, the 11 approved topics in display order: Numbers, Colours, People, Animals, Greetings, Food & Drinks, School, Free Time, Countries, Time & Weather and Culture.

- The canonical list is `js/topic-taxonomy.js` in the Vocabulary Library.
- `tests/topics-restructure.test.mjs` fails if the IDs, order, English or Chinese titles, or descriptions differ. Set `VOCABULARY_LIBRARY_DIR` to point the test at a checkout. By default it looks for the sibling folder `../vocabularylibrary-topics`, then `../vocabularylibrary`.

## Membership (dynamic)
- **Where membership comes from:** a vocabulary set belongs to the topic in its own `topicId` field.
  - `public-data.mjs` reads it with the existing anonymous published-sets query (`cache: 'no-store'`), so a normal refresh shows Vocabulary Library changes.
  - There is no hand-maintained set-to-topic map. Membership is never inferred from a set's ID or title.
- **Year badges:** derived from the published sets in each topic.
- **Topic page order:** a topic page (`#/topics?topic=<id>`) lists its sets with the Vocabulary page cards. They are sorted by year (Prep first), then by set ID, which is the Vocabulary page order and gives I, II, III within a series. Units come after vocabulary within the same year.
- **Units:** published student Units keep appearing in their topics. Unit metadata still uses the old IDs; `currentTopicIds()` maps them (`family` and `body-parts` → `people`, `food` → `food-drinks`, `weather` and `time` → `time-weather`).
- **Unit publication:** the publication page keeps offering the old 12 IDs (`UNIT_PUBLICATION_TOPICS`), because the Unit publication Function validates those. Moving it to the new IDs is a separate, approved Functions change.
- **Old links:** links such as `#/topics?topic=family` redirect to the new topic.

## Illustrations (fixed)
`TOPIC_ART` in `dist/app.mjs` maps each topic to one artwork. It never follows a vocabulary set's cover.

| Topic | Artwork |
|---|---|
| Numbers, Colours, Animals, School, Countries (globe), Culture | Their existing sprite artwork in `assets/topic-covers-transparent.png` |
| Food & Drinks | The old Food artwork |
| People | The old People artwork (four friends) |
| Greetings | The old Body Parts artwork (waving boy) |
| Free Time | `assets/topic-free-time.png` (child on a bicycle) |
| Time & Weather | `assets/topic-time-weather.png` (clock and rain cloud) |

- **New files:** both new PNGs are the owner-supplied transparent RGBA files, unchanged. They are framed in the browser on their artwork bounds, like the sprite.
- **Cards without a saved cover:** `SET_FALLBACK_ART` keeps the artwork these Vocabulary cards showed before the restructure (Numbers 0-10, Body Parts, Family, Age).
