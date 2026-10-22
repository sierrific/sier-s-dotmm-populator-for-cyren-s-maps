# Foundry v14 compatibility

Version 0.5.0 adapts the module to the documented v14 APIs while retaining v12/v13 paths. It does not upgrade your Foundry server or migrate a World itself.

## Status and scope

- Automated encounter and cross-generation API-contract tests pass. These use test doubles, not the Foundry engine.
- Live v14 validation is pending. `module.json` intentionally retains the historical `verified: 12.331` value while permitting installation through generation 14. Foundry may show an unverified-version warning.
- All 29 existing Cyren maps remain in scope, including split Level 3 maps, the Yawning Portal, and the three Skullport maps. Encounter metadata, ownership flags, and population keys are unchanged.
- Each Cyren map must remain a separate Scene with exactly one native v14 Scene Level. Manually combined multi-level Scenes are not mapped by these datasets and are blocked before mutation.
- Native Scene Levels and dungeon floors are different concepts. The module does not merge maps or rearrange your dungeon.
- D&D5e, CyrensMaps, Scene Packer, Monk's Active Tile Triggers, and optional Plutonium must each be compatible with your chosen core version. Removing old maximum-version pins is not certification of those packages. The module never bypasses their compatibility restrictions.

## Upgrade safely

1. Back up the complete Foundry user-data directory and record the current core, system, and module versions.
2. Use a separate test installation and a copy of the World for the core migration. Keep the pre-migration backup; downgrading the module does not reverse a Foundry or D&D5e World migration.
3. Install compatible dependency releases and module 0.5.0. Allow Foundry's normal World migration to finish, then reload the browser.
4. Use copies of Cyren Scenes, not production maps. Keep the original map dimensions, grid, padding, and source identifiers. Ensure each copy has one native Scene Level.
5. Complete the checklist below before updating the production installation.

## Live acceptance checklist — pending

Record the exact Foundry, D&D5e, CyrensMaps, and optional importer versions with the results.

- Open the panel from both Token controls and Module Settings as GM. Confirm players cannot run population operations.
- Exercise all four tabs, location changes, refresh, saved Actor mappings, and the independent anchor/rebuild area selectors.
- Preview a copy with numbered Tile markers; confirm placement centers still match after migration. Inspect moved/rotated markers if present.
- Create missing Tokens. Confirm their native Level matches the copy, their dimensions match the preview, and none appear on another Scene.
- Refresh and create missing again: zero duplicate Tokens. Click encounter and review-warning links to verify panning.
- Cancel a rebuild confirmation: no writes. Confirm a one-area rebuild: only owned Tokens in that area change.
- Verify unrelated Tokens, Walls, Lights, Tiles, Notes, Sounds, Drawings, Regions, and native Scene Levels remain unchanged.
- Test all three Level 3 map segments, all three Skullport maps, and the Yawning Portal; audit the remaining floor copies using the same lifecycle.
- Close the panel or switch Scenes during anchor authoring: the pending action must cancel and release its listeners. Switch Scenes after a preview: no stale preview remains.
- If using Actor imports or Plutonium, test them separately with the versions installed in the test World.
- Remove module-owned Tokens from each test copy and confirm originals remain untouched. Capture any console errors before promoting the build.

## Implementation references

The adapters follow the official [v14 scene-control hook](https://foundryvtt.com/api/v14/functions/hookEvents.getSceneControlButtons.html), [ApplicationV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html), and [DialogV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html) contracts.

Placement uses the documented [Tile origin and anchors](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.TileData.html), [Token Level field](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.TokenData.html), and [Actor token-construction API](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#getTokenDocument). API review and mocked tests do not establish live engine or third-party compatibility.
