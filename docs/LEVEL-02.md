# Level 2 — Arcane Chambers

Level 2 is included in module version 0.2.0. Its dataset contains 48 static encounter groups, 183 intended Token instances, 46 logical Actor types, and 47 validated Cyren area anchors.

## Tested workflow

The integration test used the World Scene `Level 02 (Copy)`. The module automatically selected Level 2, resolved all 46 Actor types, previewed 179 safe placements, and created those 179 Tokens. Repeating **Create missing** created zero duplicates. **Remove module Tokens** returned the copy to zero module-owned Tokens.

The World test imported the Monster Manual 2025 versions of Ghoul and Ghast plus Tough, the current equivalent used for the older Thug entry. The module still supports existing World Actors and explicit Actor UUID overrides.

## Manual-review placements

Four intended instances are deliberately excluded from automatic creation because the tested Cyren geometry has no collision-free position inside the validated local radius:

- area 22c: concealed beholder zombie;
- area 25f: the fifth petrified troglodyte;
- area 25j: petrified constrictor snake;
- area 25m: petrified mind flayer.

The review panel lists each refusal. Place those Tokens manually if desired after checking the room geometry. The module does not use unrelated fallback coordinates.

## Conditional content

Conditional or concealed encounters are included with appropriate hidden/state metadata and are visibly marked in the review panel. Confirm their narrative state before using them during play. Wandering encounter options are recorded for reference but are not populated as fixed Tokens because their quantities and occurrence are not static.
