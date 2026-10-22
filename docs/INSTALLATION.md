# Installation

## Before you begin

Stop the Foundry process before replacing an existing module directory. Back up the World before first use on a production Scene.

Required software:

- Foundry VTT v12–v14
- D&D5e 3.1.2+ in a release compatible with the chosen Foundry version
- CyrensMaps for Undermountain 1.0.0+ with compatible core support and matching map geometry

Plutonium 2.1.3+ is optional; install a compatible release if the World needs its creature importer. Importing unambiguous Actors from existing compendiums does not require Plutonium.

For v14, read [Foundry v14 compatibility](FOUNDRY-V14.md) first. The new build has automated API-contract coverage, not a completed live v14 test. Updating this module does not update Foundry, D&D5e, or other modules.

## Install from the Foundry manifest

Open **Setup → Add-on Modules → Install Module** and use this manifest URL:

```text
https://raw.githubusercontent.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/main/cyren-dotmm-populator/module.json
```

Foundry must be able to access the repository and release without signing into GitHub.

If the repository is private, this URL cannot be used directly by Foundry. Download the release assets while signed into GitHub, then follow the ZIP or helper-installer instructions below. Each release also includes `module.json` as a standalone file; the same file is already inside the ZIP. Downloading it separately does not grant Foundry access to the private ZIP URL. Do not put GitHub credentials into a manifest or installation URL.

## Install from the release ZIP

1. Download `cyren-dotmm-populator-0.5.0.zip` and its adjacent `.sha256` file from the corresponding GitHub release, or generate both in `dist/` using `npm run build`.
2. Verify the package checksum before installation. The helper installers do this automatically when the checksum file is beside the ZIP.
3. Stop Foundry.
4. Locate the Foundry user-data directory.
5. Extract the archive so `module.json` is located at:

   ```text
   <FoundryUserData>/Data/modules/cyren-dotmm-populator/module.json
   ```

6. Start Foundry, open the World, select **Manage Modules**, and enable the module.

Do not create an extra nested directory such as `cyren-dotmm-populator/cyren-dotmm-populator/module.json`.

## Helper installer — Windows

Run PowerShell from the repository or place the installer beside the downloaded ZIP:

```powershell
.\installer\install.ps1 `
  -FoundryUserData "C:\FoundryData" `
  -PackagePath ".\cyren-dotmm-populator-0.5.0.zip"
```

Use `-Force` only when replacing an existing installation. The script moves the current module into a timestamped backup directory instead of deleting it.

## Helper installer — Linux server

```bash
chmod +x installer/install.sh
./installer/install.sh \
  /home/foundry/.local/share/FoundryVTT \
  ./cyren-dotmm-populator-0.5.0.zip
```

Add `--force` as the third argument to replace an existing installation. The prior module directory is retained as a timestamped backup. Both installers reject unsafe archive paths; if extraction or validation fails, the installer restores that prior directory automatically.

Run the script as the operating-system account that owns the Foundry user-data directory. Restart the Foundry service after installation.

## Update

Install the new ZIP over the same module ID. The helper installers preserve the previous directory when `-Force` or `--force` is used. Review the changelog before enabling a new version.

## Uninstall

Before disabling the module, open its panel on each populated Scene and use **Remove module Tokens** if those Tokens should be removed. Then disable the module and delete its directory while Foundry is stopped.

Deleting the module directory alone does not remove Tokens that were already created in a Scene.
