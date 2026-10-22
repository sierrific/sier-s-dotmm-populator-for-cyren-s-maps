# Validation

Version 0.5.0 has automated data, regression, packaging, and mocked API-contract tests targeting Foundry v12–v14. A licensed v14 runtime was not available for this update: live v14 rendering, migration, third-party compatibility, and Token lifecycle tests remain pending. The available server remains on Foundry 12.331 with D&D5e 3.1.2 and was not upgraded or modified.

The integration results below are historical results from earlier releases on Foundry 12.331, not new v14 results. The manifest's `verified` field remains at that historical baseline. Follow the [v14 acceptance checklist](FOUNDRY-V14.md) before using this build in a migrated production World.

## Automated checks

- valid Foundry manifest and stable module ID;
- release URLs and package names match version 0.5.0;
- 667 unique encounter groups and 2,895 deterministic Token instance keys across the Yawning Portal, Skullport, and Levels 1–23;
- 29 supported map descriptors, including three Level 3 segments and four non-level locations;
- complete Actor names, logical keys, scene assignments, and area identifiers;
- exact positions remain inside each padded Scene canvas;
- source preference order XMM, MPMM, then MM;
- no protected prose/stat-block fields or packaged image/PDF assets;
- idempotent complete and collision-guarded plan behavior;
- partial stacked-token recovery and deliberate exact-placement overlap;
- manual anchors override verified fallbacks when numbered tiles are ambiguous or unavailable;
- unrelated embedded collections are compared by document content as well as IDs;
- pre-existing Token contents are verified and partial creation failures are rolled back;
- managed Actor cleanup requires an explicit ownership marker and the dedicated import folder;
- encounter navigation resolves existing, planned, exact-position, and anchor targets in priority order;
- v12 array-based controls and v13/v14 keyed controls retain their correct callbacks and GM restrictions;
- ApplicationV2 action delegation, native form capture, independent area selectors, tab state, and asynchronous operation locks work without legacy UI globals in the test harness;
- namespaced UUID resolution and configured document classes retain legacy fallbacks;
- v14 Tile anchors preserve marker centers, including custom origins and rotation;
- v14 Token construction passes the parent Scene and native Level, preserves exact dimensions, and keeps the dungeon ownership level separate;
- ambiguous native multi-level layouts fail before writes, and Level content changes are detected by mutation verification;
- v14 rebuild rollback restores original Token IDs, Level assignments, and unowned Tokens;
- preview cleanup and anchor cancellation settle pending actions on teardown;
- release ZIP contents are compared byte for byte with canonicalized source, and documentation links, installer targets, and SHA-256 checksum are audited;
- release ZIPs use deterministic store mode, fixed timestamps, and explicit UTF-8 entry names;
- release ZIP entries carry Unix `0644` file permissions for direct extraction on Linux hosts.

Run locally with:

```bash
npm run validate
npm test
npm run build
npm run audit
```

## Foundry integration test: Levels 3–23

Exactly one safety copy was created for every remaining map: three copies for Level 3 and one copy for each Level 4–23 map. Every test opened the copy using **View Scene** before running the module.

| Level | Maps | Actors | Anchors | Tokens created | Second run | Cleanup remaining |
|---:|---:|---:|---:|---:|---:|---:|
| 3 | 3 | 47/47 | 61/61 | 255 | 0 | 0 |
| 4 | 1 | 29/29 | 27/27 | 114 | 0 | 0 |
| 5 | 1 | 19/19 | 36/36 | 90 | 0 | 0 |
| 6 | 1 | 18/18 | 26/26 | 59 | 0 | 0 |
| 7 | 1 | 18/18 | 23/23 | 61 | 0 | 0 |
| 8 | 1 | 24/24 | 21/21 | 99 | 0 | 0 |
| 9 | 1 | 37/37 | 32/32 | 63 | 0 | 0 |
| 10 | 1 | 47/47 | 31/31 | 196 | 0 | 0 |
| 11 | 1 | 20/20 | 24/24 | 210 | 0 | 0 |
| 12 | 1 | 30/30 | 33/33 | 175 | 0 | 0 |
| 13 | 1 | 15/15 | 13/13 | 86 | 0 | 0 |
| 14 | 1 | 32/32 | 33/33 | 155 | 0 | 0 |
| 15 | 1 | 18/18 | 19/19 | 96 | 0 | 0 |
| 16 | 1 | 13/13 | 34/34 | 84 | 0 | 0 |
| 17 | 1 | 24/24 | 17/17 | 75 | 0 | 0 |
| 18 | 1 | 27/27 | 21/21 | 115 | 0 | 0 |
| 19 | 1 | 16/16 | 15/15 | 74 | 0 | 0 |
| 20 | 1 | 29/29 | 20/20 | 97 | 0 | 0 |
| 21 | 1 | 28/28 | 30/30 | 120 | 0 | 0 |
| 22 | 1 | 16/16 | 23/23 | 72 | 0 | 0 |
| 23 | 1 | 24/24 | 17/17 | 68 | 0 | 0 |
| **Total** | **23** | — | **556/556** | **2,364** | **0** | **0** |

All 23 copy workflows completed the same lifecycle: create every planned Token, run **Create missing** again with zero duplicates, remove only module-owned Tokens, and return the copy to a clean state. The source Scenes were never selected for mutation.

Levels 1 and 2 retain the previously validated workflows documented in the 0.2.x release history. Combined release coverage is 29 maps, 667 encounter groups, and 2,895 intended instances.

## Foundry integration test: Yawning Portal and Skullport

Four additional safety copies were created and opened with **View Scene**. Each location resolved only its matching copy; selecting Skull Island while the Lower & Middle copy was active correctly returned an ambiguous/unresolved Scene and blocked mutation.

| Location | Actors | Anchors | Tokens created | Second run | Cleanup remaining |
|---|---:|---:|---:|---:|---:|
| The Yawning Portal | 1/1 | 1/1 | 1 | 0 | 0 |
| Skullport — Lower & Middle | 19/19 | 16/16 | 55 | 0 | 0 |
| Skullport — Skull Island | 9/9 | 7/7 | 145 | 0 | 0 |
| Skullport — Upper | 6/6 | 6/6 | 14 | 0 | 0 |
| **Total** | — | **30/30** | **215** | **0** | **0** |

Encounter links were exercised on every map and panned to the matching module Token. Durnan remains explicitly marked for human review and is positioned behind the taproom bar. Three otherwise missing standard creatures (Cat, Frog, and Lizard) were imported from an available D&D5e Actor compendium into the dedicated module import folder. Population verification reported no changes to Walls, Lights, Tiles, Notes, Sounds, Drawings, Regions, Actors, or Scene settings.

## Installer checks

Both helper installers are tested for a clean installation, forced upgrade with timestamped backup, and restoration of the previous module after an invalid package. They verify an adjacent SHA-256 checksum and reject unsafe archive paths before extraction. The Linux script also passes shell syntax validation. The release archive is verified for a root-level `module.json`, readable module assets, and a matching SHA-256 checksum.
