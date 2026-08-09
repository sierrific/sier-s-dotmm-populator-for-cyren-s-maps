# User Guide

## Open the correct Scene

The current release supports Levels 1 and 2. In the Scenes directory, right-click **Level 01**, **Level 02**, or an authorized test copy and choose **View Scene**. The target Scene must be active before placement can be previewed.

The module verifies the Scene's source metadata, name, dimensions, and grid. It blocks when multiple plausible Scenes remain or the geometry is unexpected.

## Open the review panel

As a GM, select the Token controls and click **Sier's DotMM Populator for Cyren's Maps**. The same panel is available under **Game Settings → Configure Settings → Module Settings**.

Choose the level in the panel, then select **Refresh review** after changing Actors, compendium preferences, or anchors. When the active Scene matches a supported level, the panel selects that level automatically.

## Resolve Actors

The panel reports every required Actor and its selected source. Resolution checks:

1. explicit World override;
2. exact World Actor name;
3. preferred compendiums;
4. the D&D5e monster compendium;
5. other available Actor compendiums.

Ambiguous World matches are never selected silently. Enter an Actor UUID override and save the settings when the intended Actor cannot be chosen unambiguously.

If Plutonium is active, select **Open Plutonium** to import a missing creature as a World Actor. When equivalent creatures exist, prefer XMM, then MPMM, then MM. Close the importer and refresh the review afterward.

## Review anchors and placement

Area anchors normally come from numbered Cyren tiles or the validated metadata for the selected level. If an anchor is missing, select the area and use the anchor-authoring action to choose a point on the active Scene.

Select **Preview without saving** to draw temporary placement boxes. The preview does not create Scene documents and disappears when cleared or when the panel closes.

Some encounters are marked conditional or for human review. Confirm their narrative state and exact position before persisting Tokens.

## Create and maintain Tokens

- **Create missing** creates only deterministic module Tokens that do not already exist.
- **Reconcile** removes orphaned module Tokens and creates missing expected Tokens.
- **Rebuild area** replaces module Tokens in one selected area.
- **Rebuild Level** replaces all module Tokens for the selected level.
- **Remove module Tokens** removes only Tokens owned by this module.

Rebuild and removal actions require confirmation. Unmarked Scene Tokens are outside the module's ownership boundary.

## Collision warnings

The placement engine avoids walls, Scene bounds, and occupied Token rectangles. If it cannot find a safe grid position inside the encounter radius, it reports the placement as skipped. Move the conflicting existing Token, adjust the local Scene, or author an appropriate anchor, then refresh the review.

The module does not place a creature at an arbitrary fallback coordinate.

## Recovery

If a creation operation reports an error, inspect the notification and refresh the review. The module verifies unrelated Scene collections before and after mutations and attempts to roll back its own Token changes when verification fails.

For a clean reset, use **Remove module Tokens**, confirm that the marked count reaches zero, and run the review again. Restore the World backup if unrelated changes are observed.
