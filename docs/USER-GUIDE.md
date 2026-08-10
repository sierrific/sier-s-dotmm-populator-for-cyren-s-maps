# User Guide

## Open the correct Scene

The module supports Levels 1–23. In the Scenes directory, right-click the intended map or test copy and choose **View Scene** before opening the panel.

Level 3 is split across three maps:

- `Level 03 (1)`
- `Level 03 (2)`
- `Level 03 (3)`

All other supported levels use one Cyren map. The active Scene determines both the level and, when applicable, the map segment. The module checks source metadata, name, dimensions, padding, and grid, and blocks when multiple plausible Scenes remain.

## Create safety copies

Back up the World before the first production run. From the **Execute** tab, **Create missing safety copies (Levels 3–23)** creates one `(Copy)` Scene for each source map that does not already have one. Existing copies and source Scenes are left unchanged.

Open a copy with **View Scene** before testing. Population actions always target the currently resolved Scene; they do not batch-edit every map in the World.

## Open the review panel

As a GM, select the Token controls and click **Sier's DotMM Populator for Cyren's Maps**. The same panel is available under **Game Settings → Configure Settings → Module Settings**.

Choose a level, then select **Refresh review** after changing Actors, compendium preferences, or anchors. A compatible active Scene selects its level automatically.

## Resolve and import Actors

The panel reports every required Actor and its selected source. Resolution checks:

1. explicit World override;
2. exact World Actor name;
3. preferred compendiums;
4. the D&D5e monster compendium;
5. other available Actor compendiums.

When multiple World Actors have the same name, the dedicated `Sier's DotMM Populator Imports` folder is preferred, followed by `Monster Manual` and `Creatures`. Other ambiguous matches remain blocked.

**Import unambiguous matches** copies only clear compendium matches into the dedicated World folder. It preserves the XMM → MPMM → MM source preference and marks every Actor it creates. Duplicate cleanup requires both that ownership marker and membership in the dedicated folder, so unmarked or moved Actors are never claimed.

If Plutonium is active, **Open Plutonium** opens its creature importer for unresolved entries. Close the importer and refresh the review afterward. Named creatures and adventure variants keep their token names while using a compatible official base Actor where one is defined.

## Review anchors and placement

Area anchors normally come from numbered Cyren tiles or validated level metadata. If an anchor is missing, select the area and use the anchor-authoring action to choose a point on the active Scene.

Exact placements from the level dataset are retained. Deterministic fallback placement is used only where an exact source coordinate is unavailable. Candidates must remain within the padded Scene canvas and avoid unrelated existing Tokens and walls.

Select **Preview without saving** to draw temporary placement boxes. The preview does not create Scene documents and disappears when cleared or when the panel closes.

## Create and maintain Tokens

- **Create missing** creates only deterministic module Tokens that do not already exist.
- **Reconcile** removes orphaned module Tokens and creates missing expected Tokens.
- **Rebuild area** replaces module Tokens in one selected area.
- **Rebuild current map** replaces module Tokens on the resolved Scene only.
- **Remove module Tokens** removes only Tokens owned by this module on the resolved Scene.

Rebuild and removal actions require confirmation. Unmarked Scene Tokens and all non-Token documents are outside the module's ownership boundary.

The panel remembers the selected anchor and rebuild areas when its review refreshes. It also prevents a second action from starting while the first action is still running.

## Collision warnings

The placement engine avoids walls, padded Scene bounds, and unrelated occupied Token rectangles. If it cannot find a safe position inside the encounter radius, it reports the placement as skipped. Move the conflicting Token, adjust the local Scene, or author an appropriate anchor, then refresh the review.

## Recovery

If a creation operation reports an error, inspect the notification and refresh the review. The module removes partially created owned Tokens, restores Tokens removed by an interrupted operation, and verifies both existing Token contents and unrelated Scene collections before and after mutations.

For a clean reset, use **Remove module Tokens**, confirm that the marked count reaches zero, and run the review again. Restore the World backup if unrelated changes are observed.
