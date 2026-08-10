# Levels 3–23

Version 0.3.0 adds every remaining Undermountain floor. The module identifies the active Cyren Scene, limits work to that Scene, and preserves token names for named creatures and adventure variants while resolving an appropriate official base Actor.

## Map coverage

| Level | Title | Cyren map(s) | Encounter groups | Intended Tokens |
|---:|---|---|---:|---:|
| 3 | Sargauth Level | `Level 03 (1)`, `(2)`, `(3)` | 61 | 255 |
| 4 | Twisted Caverns | `Level 04` | 27 | 114 |
| 5 | Wyllowwood | `Level 05` | 36 | 90 |
| 6 | Lost Level | `Level 06` | 26 | 59 |
| 7 | Maddgoth's Castle | `Level 07` | 23 | 61 |
| 8 | Slitherswamp | `Level 08` | 21 | 99 |
| 9 | Dweomercore | `Level 09` | 32 | 63 |
| 10 | Muiral's Gauntlet | `Level 10` | 31 | 196 |
| 11 | Troglodyte Warrens | `Level 11` | 24 | 210 |
| 12 | Maze Level | `Level 12` | 33 | 175 |
| 13 | Trobriand's Graveyard | `Level 13` | 13 | 86 |
| 14 | Arcturiadoom | `Level 14` | 33 | 155 |
| 15 | Obstacle Course | `Level 15` | 19 | 96 |
| 16 | Crystal Labyrinth | `Level 16` | 34 | 84 |
| 17 | Seadeeps | `Level 17` | 17 | 75 |
| 18 | Vanrakdoom | `Level 18` | 21 | 115 |
| 19 | Caverns of Ooze | `Level 19` | 15 | 74 |
| 20 | Runestone Caverns | `Level 20` | 20 | 97 |
| 21 | Terminus Level | `Level 21` | 30 | 120 |
| 22 | Shadowdusk Hold | `Level 22` | 23 | 72 |
| 23 | Mad Wizard's Lair | `Level 23` | 17 | 68 |
| **Total** |  | **23 maps** | **556** | **2,364** |

Level 3 token counts by segment are 114 on part 1, 34 on part 2, and 107 on part 3.

## Safe preparation workflow

1. Back up the World.
2. Open the module panel and use **Create missing safety copies (Levels 3–23)**.
3. Right-click the desired `(Copy)` Scene and choose **View Scene**.
4. Refresh the review and confirm that Actors and anchors are fully resolved.
5. Preview, then create the missing Tokens.
6. Run the same action again to confirm that zero duplicates are created.
7. Use **Remove module Tokens** when the copy should be returned to a clean state.

The copy helper is idempotent: it creates only absent copies and never overwrites an existing Scene. Level 3 copies are named `Level 03 (1) (Copy)`, `Level 03 (2) (Copy)`, and `Level 03 (3) (Copy)`.

## Actor equivalents

The level data includes aliases for named creatures and printed adventure variants where a compatible official Actor exists. Examples include named mages resolving to Mage, Ashtyrranthor resolving to Adult Red Dragon, Derrion Shadowdusk resolving to Champion, and the hammer-handed golem resolving to Stone Golem. Token names remain unchanged.

The resolver prefers XMM, then MPMM, then MM. Review the chosen source in the Actors tab before population, especially if the World contains customized versions with the same name.
