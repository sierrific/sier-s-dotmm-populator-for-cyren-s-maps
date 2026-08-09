# Validation

Version 0.2.0 was validated against Foundry VTT 12.331, D&D5e 3.1.2–3.2.1, and CyrensMaps for Undermountain 1.0.0.

## Automated checks

- valid Foundry manifest and stable module ID;
- release URLs match the manifest version;
- 81 unique static encounter groups across Levels 1–2;
- 316 deterministic static Token instance keys across Levels 1–2;
- complete Actor names and logical keys;
- valid level-specific area identifiers and in-bounds anchors;
- source preference order XMM, MPMM, then MM;
- no protected prose/stat-block fields or packaged image/PDF assets;
- idempotent plan behavior;
- mutation guard rejects unrelated embedded-document changes.

Run locally with:

```bash
npm run validate
npm test
```

## Foundry integration test

Both level workflows were exercised on copied Scenes.

### Level 1

| Check | Result |
|---|---:|
| Actor types resolved | 29/29 |
| Area anchors resolved | 33/33 |
| Intended static Token instances | 133 |
| Safe automatic placements in the tested copy | 130 |
| Placements blocked by existing-Token collisions | 3 |
| Tokens created on first run | 130 |
| Tokens created on identical second run | 0 |
| Module Tokens removed during cleanup | 130 |
| Module Tokens remaining after cleanup | 0 |

Walls, Lights, Tiles, Notes, Sounds, Drawings, and Regions retained identical fingerprints through each tested mutation.

The three blocked placements are deliberate safety outcomes. The engine reported the collisions and did not substitute unrelated coordinates.

### Level 2

| Check | Result |
|---|---:|
| Encounter groups | 48 |
| Actor types resolved | 46/46 |
| Area anchors resolved | 47/47 |
| Intended static Token instances | 183 |
| Safe automatic placements in the tested copy | 179 |
| Placements blocked by geometry collisions | 4 |
| Tokens created on first run | 179 |
| Tokens created on identical second run | 0 |
| Module Tokens removed during cleanup | 179 |
| Module Tokens remaining after cleanup | 0 |

The four blocked placements are the concealed beholder zombie in area 22c and one petrified creature each in areas 25f, 25j, and 25m. Their Cyren rooms did not offer a collision-free rectangle within the validated encounter radius, so the module reports them for manual review instead of inventing a coordinate.

The Level 2 integration test also confirmed automatic level selection, modern Plutonium Actor resolution for Ghoul, Ghast, and Tough, a non-persistent 179-token preview, and cleanup limited to module-owned Tokens.
