# Sier's DotMM Populator for Cyren's Maps

Foundry VTT module that prepares the Yawning Portal, all three Skullport maps, and static encounters for all 23 levels of *Dungeon of the Mad Mage* on maps supplied by CyrensMaps for Undermountain. Level 3 is supported across its three map segments.

The module contains placement metadata only. It does not include maps, artwork, adventure text, journals, or creature stat blocks. Creature Actors must already exist in the World and can optionally be imported from available compendiums or with Plutonium.

For installation instructions and the full user guide, visit:

https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps

Third-party attribution is included in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Compatibility

- Foundry Virtual Tabletop v12–v14 (verified on 14.368 with live tests on all 29 map copies)
- D&D5e 3.1.2+; choose a release compatible with your Foundry version
- Previously imported CyrensMaps Scenes with unchanged geometry and original asset files; a compatible Cyren module is needed only for its own import/automation features
- Plutonium 2.1.3+ with compatible core/system support (optional for Actor imports)

The manifest records `verified: 14.368`; live testing used D&D5e 6.0.5 and preserved all 35 original Scenes. Back up the World and test on copies first. Native v14 Scene Levels are supported only when each Cyren map has exactly one Level. Split maps remain separate Scenes; combined multi-level Scenes require new placement mappings and are blocked. The final test created and safely removed 2,888 Tokens, conservatively skipping seven instances because of wall-collision guards. Review omissions rather than forcing placement through walls.

## Current scope

Version 0.5.1 covers the Yawning Portal, all three Skullport maps, Levels 1–23, 29 map descriptors, 667 encounter groups, and 2,895 intended Token instances. Existing ownership flags, settings keys, and deterministic population keys are preserved.

## Disclaimer

This is an independent fan-made utility. It is not affiliated with or endorsed by Foundry Gaming LLC, Wizards of the Coast, or the creators of CyrensMaps.
