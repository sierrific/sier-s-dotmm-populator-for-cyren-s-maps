# Changelog

All notable changes are documented here.

## 0.3.2 — 2026-08-09

- Added rollback for partially completed Token creation when Foundry throws before returning created documents.
- Added content verification for pre-existing Tokens so unexpected updates are detected in addition to unexpected creation or removal.
- Marked module-imported Actors explicitly and restricted duplicate cleanup to marked Actors that remain in the dedicated import folder.
- Displayed dataset review warnings in the panel and preserved the selected anchor and rebuild areas across refreshes.
- Made encounter names and human-review warnings clickable, panning the canvas to existing Tokens, planned placements, exact positions, or the area anchor.
- Prevented overlapping panel actions while an earlier action is still running.
- Switched release archives to deterministic ZIP store mode and added byte-for-byte source verification, fixed-timestamp checks, and UTF-8 entry checks.
- Added SHA-256 verification and unsafe-path rejection to both helper installers.
- Added dependency auditing and full package validation on pushes, pull requests, and releases.
- Expanded runtime metadata validation for Actor lists, stacking order, Token options, encounter radii, and duplicate Actor keys.

## 0.3.1 — 2026-08-09

- Fixed **Rebuild area** reading the selector from the Anchors tab instead of the selected **Area to rebuild** value.
- Gave anchor authoring and area rebuild independent form controls.
- Added release validation that rejects the legacy shared selector wiring.

## 0.3.0 — 2026-08-09

- Added Levels 3–23, completing all 23 Undermountain floors across 25 map descriptors.
- Added multi-Scene level resolution for the three Level 3 map segments.
- Added 556 encounter groups and 2,364 deterministic Token instances for the remaining floors.
- Added a GM-only helper that creates only missing safety copies for Levels 3–23.
- Added optional import of unambiguous compendium Actors into a dedicated World folder.
- Added official-equivalent aliases for named creatures and printed variants while preserving token names.
- Extended placement to exact source coordinates and padded Scene canvases.
- Confirmed complete Actor and anchor resolution on every remaining map copy.
- Exercised create, identical second run, and owned-token cleanup on all 23 copies with zero duplicates and zero module Tokens left afterward.
- Added full-scope documentation, validation coverage, and third-party attribution.

## 0.2.1 — 2026-08-09

- Strengthened mutation fingerprints to detect content changes in Walls, Lights, Tiles, Notes, Sounds, Drawings, and Regions.
- Fixed partial recovery of stacked Tokens when the corresponding host Token already exists.
- Allowed manual anchors to override validated fallback coordinates when no numbered Cyren tile is present.
- Made release ZIPs reproducible and added a SHA-256 checksum asset.
- Recorded portable Unix file permissions in release ZIPs so direct Linux extraction produces readable module assets.
- Added transactional rollback to both helper installers when a forced update fails.
- Added a release audit covering version consistency, package structure, checksum, documentation links, installer targets, and workflow assets.

## 0.2.0 — 2026-08-09

- Added Level 2 (Arcane Chambers) with 48 static encounter groups, 183 intended instances, 46 Actor types, and 47 area anchors.
- Added level selection and automatic active-Scene level detection while preserving the Level 1 workflow.
- Added ordered modern-equivalent Actor names and optional token-size overrides.
- Imported and validated the 2025 Ghoul, Ghast, and Tough equivalents through Plutonium in the test World.
- Verified 179 safe Level 2 placements, zero duplicates on a repeated run, and complete owned-token cleanup on `Level 02 (Copy)`.
- Documented four collision-safe manual-review placements that are intentionally not assigned arbitrary fallback coordinates.

## 0.1.2 — 2026-08-09

- Renamed the public module and toolbar label to **Sier's DotMM Populator for Cyren's Maps**.
- Added a validated Level 1 population dataset with 33 encounter groups and 133 deterministic instances.
- Added Scene, Actor, and anchor review before persistence.
- Added World Actor overrides and modern-source preference for XMM, MPMM, then MM.
- Added optional Plutonium importer integration.
- Added non-persistent placement preview, idempotent creation, reconciliation, area/level rebuild, and owned-Token removal.
- Added mutation verification and collision-safe placement behavior.
- Added manifest-based updates, release packaging, installation helpers, and project documentation.
