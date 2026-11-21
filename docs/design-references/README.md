# The Mandarin Room — Design References

Six visual reference mockups for Codex. These are static concepts, not functional screenshots.

- `01-home.png`: Homepage with Vocabulary, Units, Activities only. **No Explore by Year Level section on Home.**
- `02-year-levels.png`: Dedicated Year Levels page; English Prep, Year 1–Year 6; pastel backgrounds with vivid matching text colours.
- `03-topics.png`: Topic discovery page.
- `04-pinyin.png`: Pinyin page.
- `05-hanzi.png`: Hanzi page.
- `06-about.png`: Bilingual About and contact form.

## Latest decisions override older labels shown in images

1. Global navigation: Home | Year Levels | Topics | Pinyin | Hanzi | About; search and **Admin** on right (not Teacher Login). *Superseded 2026-11-21 by the owner-approved homepage redesign: the same sign-in button is now labelled **Teacher Login**; behaviour unchanged.*
2. The Explore by Year Level cards appear **only** on the dedicated Year Levels page.
3. Grade labels are English: Prep, Year 1, Year 2, Year 3, Year 4, Year 5, Year 6.
4. About contact form is a design placeholder until a secure backend and email delivery are configured.
5. Existing apps must remain operational; avoid unapproved production/data changes.
6. These images contain illustrative content and should not be used as a source of verified curriculum, resource availability, or functioning controls.

## Approved revision — staircase and Yin-Yang identity

The user supplied 07-year-levels-staircase.png and 08-yin-yang-brand.png as the replacement direction. The Year Levels scene now follows the staircase reference; the Yin-Yang emblem replaces the vertical seal across the integration header, footer and favicon. These latest decisions override the original six mockups for those elements.

## Approved homepage promotion

The staircase is now the homepage, headed “Welcome to The Mandarin Room”. The supplied illustration is reused unchanged, with its old title region clipped and replaced by live responsive HTML. Year Levels is removed from navigation; old routes redirect to Home. Vocabulary, Units and Activities are independent pastel resource pages. This decision supersedes the earlier homepage three-column layout and separate Year Levels page.

## Approved homepage redesign (2026-11-21)

`09-homepage-redesign-reference.png` is the approved reference. The watercolour hero is reused unchanged: `dist/assets/home-hero-1755.webp` (and a 900 px variant) is cropped from rows 80–688 of that file, excluding the reference's header and year cards. The staircase and its live “Welcome” heading are retired from Home; seven compact pastel year-level cards (line icon, English year name, arrow) link to the existing `#/journey?year=N` routes. The header sign-in button is labelled **Teacher Login**. The reference shows dropdown chevrons on Vocabulary, Activities and Topics; the site has no dropdown menus, so none were added.
