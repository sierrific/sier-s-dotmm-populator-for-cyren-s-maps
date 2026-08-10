# Sier's DotMM Populator for Cyren's Maps

A safety-first Foundry VTT module for preparing the static encounters on all 23 levels of *Dungeon of the Mad Mage* using **CyrensMaps for Undermountain**.

The module reviews Scene compatibility, resolves creature Actors, previews deterministic placement, and creates only explicitly flagged Tokens. It does not distribute maps, artwork, adventure prose, journals, or creature stat blocks.

> **Current scope:** Levels 1–23, including all three Level 3 map segments. Foundry VTT 12.331 and D&D5e 3.1.2–3.2.1.

![Level 1 review panel](docs/images/level-01-review.png)

![Level 2 populated test scene](docs/images/level-02-populated.png)

## Features

- Supports Levels 1–23 and resolves split floors by the active Scene; Level 3 uses three Cyren maps.
- Creates any missing safety copies for Levels 3–23 without modifying the originals.
- Resolves World and compendium Actors without silently choosing ambiguous matches.
- Can import unambiguous Actor matches into a dedicated World folder.
- Prefers newer equivalent creature sources in the order XMM, MPMM, then MM.
- Opens Plutonium's creature importer when Plutonium is available.
- Previews placements without saving documents.
- Creates, reconciles, rebuilds, and removes only module-owned Tokens.
- Uses deterministic instance keys, so repeated runs are idempotent.
- Verifies that Walls, Lights, Tiles, Notes, Sounds, Drawings, and Regions remain unchanged.
- Rolls back module Token changes after partial creation failures and detects unexpected changes to existing Tokens.
- Marks imported Actors explicitly so cleanup cannot claim unmarked World content.
- Blocks persistence while a Scene, Actor, or area anchor is unresolved.

## Install

### Foundry manifest

In **Setup → Add-on Modules → Install Module**, paste:

```text
https://raw.githubusercontent.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/main/cyren-dotmm-populator/module.json
```

### Release ZIP

Download `cyren-dotmm-populator-0.3.2.zip` from the latest release and extract it into:

```text
<FoundryUserData>/Data/modules/cyren-dotmm-populator
```

Windows and Linux helper scripts are provided in [`installer/`](installer/). Each release includes the ZIP, both installers, and a SHA-256 checksum. See [Installation](docs/INSTALLATION.md) for complete instructions.

## Requirements

| Component | Supported version | Required |
|---|---:|---:|
| Foundry Virtual Tabletop | 12.331 | Yes |
| D&D5e system | 3.1.2–3.2.1 | Yes |
| CyrensMaps for Undermountain | 1.0.0 | Yes |
| Plutonium | 2.1.3 | No, but recommended |

Actors are not distributed by this project. Import or create the required Actors in the World before populating a Scene.

## Quick start

1. Install and enable CyrensMaps for Undermountain, D&D5e, and this module.
2. Back up the World. For Levels 3–23, the panel can create missing `(Copy)` Scenes for safe preparation.
3. In the Scenes directory, right-click the map or its test copy and choose **View Scene**. Level 3 is split across `Level 03 (1)`, `(2)`, and `(3)`.
4. Open **Sier's DotMM Populator for Cyren's Maps** from the Token controls or Module Settings.
5. Refresh the review and resolve every Actor or anchor warning. The active Scene selects the matching level and map segment.
6. Use **Import unambiguous matches** or **Open Plutonium** for missing creatures. Source preference is XMM, then MPMM, then MM.
7. Run **Preview without saving** and inspect the Scene.
8. Select **Create missing** only after the review is clear.

See the [User Guide](docs/USER-GUIDE.md) for recovery, reconciliation, safety copies, and rebuilds.

## Safety model

Every created Token receives a `flags.cyren-dotmm-populator` ownership marker and deterministic key. Removal and rebuild operations query those flags and cannot target unmarked Tokens. Persistent operations are GM-only and destructive actions require confirmation.

The full design is documented in [Technical Notes](docs/TECHNICAL.md). Test results are summarized in [Validation](docs/VALIDATION.md).

## Development

```bash
npm install
npm run validate
npm test
npm run build
npm run audit
```

The build command creates a cross-platform deterministic Foundry-ready ZIP and SHA-256 checksum in `dist/`. Release tags named `v<version>` are validated, packaged, audited, and published by GitHub Actions.

See [Development and releases](docs/DEVELOPMENT.md).

## Documentation

- [Installation](docs/INSTALLATION.md)
- [User Guide](docs/USER-GUIDE.md)
- [Levels 3–23](docs/LEVELS-03-23.md)
- [Technical Notes](docs/TECHNICAL.md)
- [Validation](docs/VALIDATION.md)
- [Level 2 notes](docs/LEVEL-02.md)
- [Development and releases](docs/DEVELOPMENT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Changelog](CHANGELOG.md)
- [Security policy](SECURITY.md)

## Legal

This project distributes only original module code and minimal encounter/placement metadata. You must supply your own licensed Foundry VTT installation, game system, maps, adventure material, and creature data.

This is an independent fan-made utility. It is not affiliated with or endorsed by Foundry Gaming LLC, Wizards of the Coast, or the creators of CyrensMaps.
