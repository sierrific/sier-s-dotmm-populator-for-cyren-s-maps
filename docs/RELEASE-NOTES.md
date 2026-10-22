# Sier's DotMM Populator 0.5.1

## Foundry v14 runtime fixes

The legacy Cyren content package is recommended rather than mandatory. The populator can be enabled in v14 with previously imported maps and their original assets, even when Cyren 1.0.0 cannot load. Fresh map imports and Cyren automation still require compatible upstream packages.

D&D5e 6 no longer overrides reviewed Token footprints during creation. The fix applies only to newly created module Tokens; Actor prototypes and World settings are untouched. Area markers use Foundry's prepared Tile shape centers, including custom texture anchors and rotation.

The window's Close button remains available during anchor authoring so a pending canvas pick can be cancelled safely.

Live lifecycle tests passed on 29 disposable map copies in Foundry 14.368 with D&D5e 6.0.5. All 35 source Scenes remained unchanged. Data scope remains 667 encounter groups and 2,895 intended instances. The final sweep created and safely removed 2,888 Tokens; collision guards conservatively skipped 7 instances on the migrated Level 1/2 copies, which require GM placement review.

Use one native Scene Level per Cyren map. Split floors remain separate Scenes; combined native multi-level Scenes are blocked until they have explicit placement mappings. Dependencies must have their own compatible releases; this update does not upgrade Foundry, D&D5e, CyrensMaps, or Plutonium.

## Installation files

- `module.json` — standalone Foundry manifest, also included in the ZIP.
- `cyren-dotmm-populator-0.5.1.zip` — installable module package.
- `cyren-dotmm-populator-0.5.1.zip.sha256` — package checksum.
- `install.ps1` — Windows helper installer.
- `install.sh` — Linux/server helper installer.

In **Foundry Setup → Add-on Modules → Install Module**, paste this public manifest URL:

```text
https://raw.githubusercontent.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/main/cyren-dotmm-populator/module.json
```

For manual installation, download the ZIP and checksum from this release. Stop Foundry and use the appropriate helper, or extract the ZIP into `Data/modules/cyren-dotmm-populator`. Do not install the JSON by itself. Back up before upgrading.

See [Installation](https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/blob/v0.5.1/docs/INSTALLATION.md), [v14 compatibility](https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/blob/v0.5.1/docs/FOUNDRY-V14.md), [Validation](https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/blob/v0.5.1/docs/VALIDATION.md), and [Changelog](https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/blob/v0.5.1/CHANGELOG.md).
