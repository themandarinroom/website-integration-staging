# The Mandarin Room: UI and design standard

**Owner document** for UI and visual design across The Mandarin Room: this website and the Vocabulary Library apps and tools. It is part of the Shared Development Standards v1.0 ([hub](https://github.com/themandarinroom/vocabularylibrary/blob/main/docs/PROJECT_STANDARDS.md)).

**Decision-log principle:** the latest explicitly approved decision takes precedence over older references, mockups and labels. §1 is the current standard. §2 onwards is the decision log, oldest first, kept for history. Do not introduce a new visual system. Extend these conventions and report any ambiguity before implementing.

## 1. Current standard (28 Nov 2026)

**Design tokens**
- `tmr-tokens.css` (v1) holds every shared custom property: page and ink colours, brand greens, the seven card pastels, year-level colours, fonts, radii, the 44 px control height and header logo sizes.
- **Source of truth:** this website's `dist/tmr-tokens.css`. The Vocabulary Library keeps a byte-identical copy in `css/tmr-tokens.css` (verified identical on 28 Nov 2026). No app loads CSS from another site.
- Change tokens here first, then copy them byte-for-byte, as an approved change in both repositories.
- The Vocabulary Library's shared brand and header CSS is `css/tmr-brand.css`, used by the Library and every tool.

**Colour**
- White page (`--tmr-page`), navy ink `#0c193b`, muted text `#617797`, brand green `#27875b`.
- Cards use the seven approved pastels (pink, peach, yellow, mint, aqua, blue, lavender); the Pinyin cards use the same set.
- **Year levels** use `--tmr-year-0` … `--tmr-year-6`, each with its `-bg` pastel: Prep pink, Year 1 peach/orange, Year 2 yellow/amber, Year 3 green, Year 4 aqua, Year 5 blue, Year 6 purple. Use these for year labels and badges everywhere.

**Typography**
- **UI font:** `--tmr-font-ui` (Avenir Next, then Avenir, Segoe UI, Arial, PingFang SC, Microsoft YaHei).
- **Chinese display font:** `--tmr-font-chinese` (KaiTi family) where a design calls for it.
- **Year labels:** English (Prep, Year 1 … Year 6).
- **Chinese and pinyin:**
  - Vocabulary shows pinyin (lowercase, no tones, with `ü`) directly above the Chinese.
  - Students can switch to "Chinese only".
  - Text content standards are in the Vocabulary Library's `docs/VOCABULARY_SET_CREATION.md` §8–§9.
  - Minimum game text sizes: 18 px Hanzi and 14 px pinyin and English (Tarsia).

**Headers and navigation**
- **Website navigation:** Home | Vocabulary | Units | Activities | Topics | Pinyin | Hanzi | About, with search and **Teacher Login** on the right.
- **Brand:** the Yin-Yang emblem in the header, footer and favicon.
- **Vocabulary Library apps and tools** follow the unified tool header in the Vocabulary Library's `HEADER-STANDARD-v1.0.txt`:
  - 56 px logo (44 px at ≤ 700 px), 22 px navy title, 14 px muted subtitle;
  - an 84 px bar, becoming 112 px on touch devices because every link gets a 44 px target;
  - the logo and title link to themandarinroom.au.
- **Listening Games headers** read "Listening Games · <game>" and link to `https://themandarinroom.au/#/activities/listening-games`. This supersedes the header standard's original `#/activities` subtitle link for Bingo.

**Cards and links**
- **Whole-card click targets.** A navigation card is one `<a>` (or button) covering the whole card.
- No right-arrow icons, no arrow circles and no "Introduction" badges on navigation cards. This was approved 23 Nov for Home, Vocabulary and Topics, and 27–28 Nov for Activities, Listening Games, Vocabulary Games and Pinyin.
- Cards use the card radius (`--tmr-radius-card`, 16 px) and pastel backgrounds.

**Vocabulary covers and images**
- A set card shows the set's saved cover in the artwork slot with `object-fit: contain`: never cropped or distorted, transparency kept.
- Without a cover, the card falls back to its previous artwork, or "文". Topic illustrations are fixed site artwork and never follow a set's cover.
- Student View flashcards show an item image at its natural size, up to 360 × 220 CSS px.
- Image preparation rules are in the Vocabulary Library's `docs/ASSETS.md`.

**Responsive layouts and touch**
- **Required viewports:** desktop, iPad portrait and landscape (the school iPad 7 and iPad 9), and phone. There must be no horizontal page overflow.
- **Touch targets** are at least 44 px (`--tmr-control-height`).
- **Phone-only scrolling layouts** (≤ 600 px) are allowed for games where a fixed board cannot fit (Tarsia); iPad layouts are unchanged by them.
- **Accessibility:**
  - visible keyboard focus (a 3 px blue outline in tool headers);
  - one `h1` per page;
  - semantic links, with no click handlers on whole headers;
  - Escape closes dialogs and restores focus.

**Game UI conventions (Vocabulary Library tools)**
- **Word selection:** the Great Wall-style word selector is shared by Build the Great Wall, Bingo Solo and Tarsia Puzzle.
  - Students choose sets, then words.
  - Each set has "Choose all".
  - The selector shows Hanzi and English chips.
- **Listening Break:** `tools/bingo-board/listen-guard.mjs`.
  - Five taps within 2 s trigger a 30 s break, stored per game.
  - Used by Bingo Solo and Build the Great Wall.
- **Audio:** AI Voice and Teacher Voice controls are separate. AI Voice names a standard Mandarin voice (Vocabulary Library `docs/ASSETS.md` §6).
- **Tarsia Puzzle** uses a compact 68 px game header (an approved game-specific exception to the 84/112 px tool header). Labels are printed on the pieces and turn with them; only the Word Bank is upright.

**Open ambiguities, reported for owner review (not resolved here)**
1. **Two header systems.** The website header and the tool header differ: website logo sizes come from tokens, and tools use `HEADER-STANDARD-v1.0.txt`. Should one document own both?
2. **The header standard's text is partly superseded** (the Bingo subtitle link and the Tarsia 68 px header). Should it be revised to v1.1?
3. **`--tmr-font-chinese` (KaiTi)** is defined, but not every Chinese display uses it. Which screens must use it?
4. **iPad portrait test size.** Website checks have used both 810 × 1080 and 768 × 1024. Which is canonical?

## 2. Decision log

### 2.1 Original mockups (Oct 2026)

Six visual reference mockups for Codex. These are static concepts, not functional screenshots.

- `01-home.png`: Homepage with Vocabulary, Units, Activities only. **No Explore by Year Level section on Home.**
- `02-year-levels.png`: Dedicated Year Levels page; English Prep, Year 1–Year 6; pastel backgrounds with vivid matching text colours.
- `03-topics.png`: Topic discovery page.
- `04-pinyin.png`: Pinyin page.
- `05-hanzi.png`: Hanzi page.
- `06-about.png`: Bilingual About and contact form.

### 2.2 Early decisions overriding the mockups

1. Global navigation: Home | Year Levels | Topics | Pinyin | Hanzi | About; search and **Admin** on right (not Teacher Login). *Superseded 2026-11-21 by the owner-approved homepage redesign: the same sign-in button is now labelled **Teacher Login**; behaviour unchanged.*
2. The Explore by Year Level cards appear **only** on the dedicated Year Levels page.
3. Grade labels are English: Prep, Year 1, Year 2, Year 3, Year 4, Year 5, Year 6.
4. About contact form is a design placeholder until a secure backend and email delivery are configured.
5. Existing apps must remain operational; avoid unapproved production/data changes.
6. These images contain illustrative content and should not be used as a source of verified curriculum, resource availability, or functioning controls.

### 2.3 Staircase and Yin-Yang identity

The user supplied 07-year-levels-staircase.png and 08-yin-yang-brand.png as the replacement direction. The Year Levels scene now follows the staircase reference; the Yin-Yang emblem replaces the vertical seal across the integration header, footer and favicon. These latest decisions override the original six mockups for those elements.

### 2.4 Homepage promotion (superseded by 2.5)

The staircase is now the homepage, headed “Welcome to The Mandarin Room”. The supplied illustration is reused unchanged, with its old title region clipped and replaced by live responsive HTML. Year Levels is removed from navigation; old routes redirect to Home. Vocabulary, Units and Activities are independent pastel resource pages. This decision supersedes the earlier homepage three-column layout and separate Year Levels page.

### 2.5 Homepage redesign (2026-11-21)

`09-homepage-redesign-reference.png` is the approved reference. The watercolour hero is reused unchanged: `dist/assets/home-hero-1755.webp` (and a 900 px variant) is cropped from rows 80–688 of that file, excluding the reference's header and year cards. The staircase and its live “Welcome” heading are retired from Home; seven compact pastel year-level cards (line icon, English year name, arrow) link to the existing `#/journey?year=N` routes. The header sign-in button is labelled **Teacher Login**. The reference shows dropdown chevrons on Vocabulary, Activities and Topics; the site has no dropdown menus, so none were added.

### 2.6 Later approved decisions (Nov 2026)

- **2026-11-22:** unified tool header v1.0 (Vocabulary Library `HEADER-STANDARD-v1.0.txt`). The Listening Games headers link to the Listening Games page.
- **2026-11-23:** navigation arrows removed; whole-card links on Home, Vocabulary and Topics.
- **2026-11-25:** Topics v1.1 (13 topics) with fixed topic illustrations (`docs/TOPICS.md`). Pinyin learning cards are whole-card with no arrows or badges and single-line labels (Staging; unreleased).
- **2026-11-27:** Activities and Listening Games card arrows removed; Topics index heading simplified.
- **2026-11-28:** Activities gains a fourth card, Vocabulary Games, a whole-card pink `activity-card` with no arrow.
