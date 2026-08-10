# Validation

Version 0.3.0 was validated against Foundry VTT 12.331, D&D5e 3.1.2–3.2.1, and CyrensMaps for Undermountain 1.0.0.

## Automated checks

- valid Foundry manifest and stable module ID;
- release URLs and package names match version 0.3.0;
- 637 unique encounter groups and 2,680 deterministic Token instance keys across Levels 1–23;
- 25 supported map descriptors, including three Level 3 segments;
- complete Actor names, logical keys, scene assignments, and area identifiers;
- exact positions remain inside each padded Scene canvas;
- source preference order XMM, MPMM, then MM;
- no protected prose/stat-block fields or packaged image/PDF assets;
- idempotent complete and collision-guarded plan behavior;
- partial stacked-token recovery and deliberate exact-placement overlap;
- manual anchors override verified fallbacks when numbered tiles are ambiguous or unavailable;
- unrelated embedded collections are compared by document content as well as IDs;
- release ZIP contents, documentation links, installer targets, and SHA-256 checksum are audited;
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

Levels 1 and 2 retain the previously validated workflows documented in the 0.2.x release history. Combined release coverage is 25 maps, 637 encounter groups, and 2,680 intended instances.

## Installer checks

Both helper installers are tested for a clean installation, forced upgrade with timestamped backup, and restoration of the previous module after an invalid package. The Linux script also passes shell syntax validation. The release archive is verified for a root-level `module.json`, readable module assets, and a matching SHA-256 checksum.
