# Verification checklist

The required automated tests and the Production release checks are in [AGENTS.md](../AGENTS.md) §4 and §6. This file is the **browser and device checklist** used alongside them. The reporting rules, including which kind of verification is which, are in the [shared standards §7](https://github.com/themandarinroom/vocabularylibrary/blob/main/docs/PROJECT_STANDARDS.md).

The October 2026 verification record that used to be here is in git history (`80b4ab7`). Per-release evidence is listed in AGENTS.md §7 and the shared workspace `outputs/`.

## Browser checks (every UI change)

- **Viewports:** desktop 1536 × 1000, iPad portrait 810 × 1080 or 768 × 1024, iPad landscape 1080 × 810, and phone 375 × 812. No document horizontal overflow; one `h1` per page; the correct active navigation item.
- **Interaction:** whole-card links open their target. Keyboard focus is visible, and Escape closes dialogs and restores focus.
- **Console:** no errors (the known harmless `/favicon.ico` 404 on teacher pages excepted).
- **Production claims:** check `build/production/` or the live files, never `dist/`.
- **Vocabulary and Topics:** covers load with `object-fit: contain` and no cropping. Year labels and badges are correct. Topic illustrations are unchanged.

## Device checks (classroom-facing changes)

- **Devices:** the school iPad 7 (iPadOS 18) and iPad 9, on the school network.
  - The school filter blocks `*.web.app`, so classroom previews of games run on `themandarinroom.github.io`.
- **Audio:** AI Voice audible, Teacher Voice plays, reload and orientation change work.
- **Reporting:** record the device, OS and result. Browser viewport simulation is never reported as a device test.

## Release checks

These follow AGENTS.md §6:
- every live file byte-identical on themandarinroom.au **and** the-mandarin-room.web.app;
- then a smoke test of Home, Vocabulary, Topics, Activities (both game pages), About, Units Management, Journey and Unit publication.
