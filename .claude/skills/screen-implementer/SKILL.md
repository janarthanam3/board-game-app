---
name: screen-implementer
description: Turn a docs/screens/*.md spec into React Native code without deviating from the design. Use for every screen, sheet, card, dialog and overlay in the app, and before changing any existing screen's layout, spacing, colour, type or copy.
---

# Screen implementer

## When this applies

Any UI work. Building a new screen, fixing a screen, restyling anything. The spec is the source of
truth and the design file behind it is the authority.

## Procedure

1. **Read the whole spec first.** `docs/screens/<opt>-<name>.md`, all ten sections, before writing a
   line. The layout map in §2 gives the region order; §3 gives every element with its exact tokens.
2. **Build the regions top to bottom in the spec's order.** Do not reorder, do not group
   differently, do not "simplify" a two-line header into one.
3. **Take every value from `packages/shared/src/tokens.ts`.** If a token is missing, add it there
   from `docs/02-design-tokens.md` — never inline a hex, a font size or a spacing number.
4. **Use the components in `docs/03-design-system.md`.** If the spec names `SettingRow`, use
   `SettingRow`. Do not hand-roll a row that looks similar.
5. **Copy is verbatim.** Every label, hint, empty-state sentence, error message and button word is
   quoted in the spec. Copy and paste it; do not rewrite, re-capitalise or re-punctuate it.
6. **Implement every state in §4**, not just the happy path: empty, loading, error, offline,
   disconnected, reconnecting, spectating, disabled, first-run. A state marked "not applicable" is
   the only one you may skip.
7. **Wire every interaction in §5** with its validation, optimistic UI, server call and both
   outcomes.
8. **Apply §7 responsive rules and §8 accessibility** as you build, not afterwards.
9. **Use §9's durations and easings exactly.**
10. **Turn §10's acceptance criteria into tests**, one test per numbered criterion.

## Never

- Never substitute a platform-standard pattern for the designed one (no Material bottom bar, no
  iOS-style back chevron swap, no default switch styling).
- Never change spacing "to look better", round a 17dp padding to 16, or swap a font weight.
- Never hide a disabled control that the spec says stays visible with a reason.
- Never invent copy for a state the spec does not describe — add it to `docs/OPEN-QUESTIONS.md`.
- Never leave a browser-default or platform-default focus, hover or pressed state.

## If you think the design is wrong

Implement it as specified, then append the concern to `docs/design-concerns.md` with the screen,
what you think is wrong and why. Do not fix it in code.

## Checklist before you call a screen done

- [ ] Region order matches the §2 layout map.
- [ ] Every element in §3 exists with its documented token values.
- [ ] All copy is character-for-character identical to the spec.
- [ ] Every applicable state in §4 renders.
- [ ] Every interaction in §5 works, including its failure branch.
- [ ] Tap targets ≥ 44dp; the contrast values in §8 verified.
- [ ] 360dp, tablet, landscape and 130% font scale all hold.
- [ ] One test per acceptance criterion, all passing.
- [ ] `/design-check` reports no deviation.
