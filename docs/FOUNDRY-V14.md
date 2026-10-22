# Foundry v14 compatibility

Version 0.5.1 includes fixes verified in Foundry 14.368 with D&D5e 6.0.5, while retaining v12/v13 paths. It does not upgrade your Foundry server or migrate a World itself.

## Status and scope

- Automated encounter and cross-generation API-contract tests pass. These use test doubles, not the Foundry engine.
- Live population lifecycle tests passed on all 29 copied maps in an isolated Foundry 14.368 World. See [validation results and limitations](VALIDATION.md). This does not certify every optional importer or upstream automation feature.
- The manifest records `verified: 14.368`. Version 0.5.1 also fixes Close-button availability during anchor authoring.
- All 29 existing Cyren maps remain in scope, including split Level 3 maps, the Yawning Portal, and the three Skullport maps. Encounter metadata, ownership flags, and population keys are unchanged.
- Each Cyren map must remain a separate Scene with exactly one native v14 Scene Level. Manually combined multi-level Scenes are not mapped by these datasets and are blocked before mutation.
- Native Scene Levels and dungeon floors are different concepts. The module does not merge maps or rearrange your dungeon.
- D&D5e and any enabled third-party modules must be compatible with your chosen core version. The populator can operate on previously imported Cyren Scenes without running the Cyren content module. This is not certification of Cyren imports, teleports, or scene transformations under v14.

## Legacy Cyren dependency

The supplied CyrensMaps 1.0.0 package uses an old manifest (`name`, `entity`, and `minimumCoreVersion`) which Foundry 14 does not load. Version 0.5.0 incorrectly declared that content package as a mandatory runtime dependency, making the populator impossible to enable even when all maps were already imported.

The fix makes Cyren a recommended content source and shows a warning when it is inactive. The populator uses World Scenes and Actors, not Cyren's JavaScript API. Scene identity, exact geometry, anchor resolution, Actor resolution, and native Scene Level checks remain enforced. Keep the original Cyren asset files at their existing paths: imported Scenes may still reference those files even when the module is inactive. Do not rewrite the upstream manifest to claim compatibility or force its old scripts to load.

For a fresh World, import maps using a compatible version of the content package, or migrate a backed-up World with the maps already imported. This module does not supply the maps or perform that import.

## Upgrade safely

1. Back up the complete Foundry user-data directory and record the current core, system, and module versions.
2. Use a separate test installation and a copy of the World for the core migration. Keep the pre-migration backup; downgrading the module does not reverse a Foundry or D&D5e World migration.
3. Install compatible dependency releases and module 0.5.1. Allow Foundry's normal World migration to finish, then reload the browser.
4. Use copies of Cyren Scenes, not production maps. Keep the original map dimensions, grid, padding, and source identifiers. Ensure each copy has one native Scene Level.
5. Complete the checklist below before updating the production installation.

## Acceptance checklist for your World

The isolated test results are recorded in [Validation](VALIDATION.md). Repeat these checks for your own World and module combination; record exact core, system, and optional importer versions.

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

Placement uses Foundry's prepared Tile shape center, with fallbacks for texture-based and top-level anchors. This accounts for differences between early [Tile API contracts](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.TileData.html) and the stable 14.368 runtime. Token creation uses the [Token Level field](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.TokenData.html) and [Actor token-construction API](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#getTokenDocument). D&D5e's per-Token `lockSize` flag preserves reviewed footprints without changing Actors or their prototype Tokens. API review and mocked tests alone do not establish third-party compatibility.
