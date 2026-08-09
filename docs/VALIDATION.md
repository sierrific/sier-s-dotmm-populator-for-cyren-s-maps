# Validation

Version 0.1.2 was validated against Foundry VTT 12.331, D&D5e 3.1.2–3.2.1, and CyrensMaps for Undermountain 1.0.0.

## Automated checks

- valid Foundry manifest and stable module ID;
- release URLs match the manifest version;
- 33 unique static encounter groups;
- 133 deterministic static Token instance keys;
- complete Actor names and logical keys;
- valid Level 1 area identifiers and in-bounds anchors;
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

The Level 1 workflow was exercised on a copied Scene:

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
