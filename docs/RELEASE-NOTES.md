# Sier's DotMM Populator 0.5.0

## Foundry v14 API compatibility

This release adapts the module to Foundry v14 while retaining v12/v13 paths. It updates the panel and confirmation dialogs to ApplicationV2/DialogV2, supports modern scene controls and document namespaces, corrects v14 Tile-anchor coordinates, and assigns newly created Tokens to their native Scene Level.

All 29 existing maps, 667 encounter groups, and 2,895 intended Token instances remain in scope. Encounter datasets and existing population keys are unchanged. Additional fixes preserve mappings for other locations, prevent overlapping panel actions, settle cancelled anchor authoring, and keep safety copies inactive.

**Live v14 verification is still pending.** Automated data, regression, mocked API-contract, and release-package checks pass, but these are not a substitute for a real Foundry test. The manifest intentionally retains the historical `verified: 12.331` value while allowing v12–v14. Test in a backed-up World and on Scene copies before production use.

Use one native Scene Level per Cyren map. Split floors remain separate Scenes; combined native multi-level Scenes are blocked until they have explicit placement mappings. Dependencies must have their own compatible releases; this update does not upgrade Foundry, D&D5e, CyrensMaps, or Plutonium.

## Installation files

- `module.json` — standalone Foundry manifest, also included in the ZIP.
- `cyren-dotmm-populator-0.5.0.zip` — installable module package.
- `cyren-dotmm-populator-0.5.0.zip.sha256` — package checksum.
- `install.ps1` — Windows helper installer.
- `install.sh` — Linux/server helper installer.

**Private repository:** download the assets while signed into GitHub. Foundry cannot fetch a private GitHub manifest or ZIP directly. Stop Foundry and install the ZIP with the appropriate helper, or extract it into `Data/modules/cyren-dotmm-populator` inside the Foundry user-data directory. Do not install the JSON by itself. Back up the current installation before upgrading.

See [Installation](https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/blob/v0.5.0/docs/INSTALLATION.md), [v14 compatibility and acceptance checklist](https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/blob/v0.5.0/docs/FOUNDRY-V14.md), and [Changelog](https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/blob/v0.5.0/CHANGELOG.md).
