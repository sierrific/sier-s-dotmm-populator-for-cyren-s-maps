# Installation

## Before you begin

Stop the Foundry process before replacing an existing module directory. Back up the World before first use on a production Scene.

Required software:

- Foundry VTT 12.331
- D&D5e 3.1.2–3.2.1
- CyrensMaps for Undermountain 1.0.0

Plutonium 2.1.3 is optional and recommended when the World does not already contain all required creature Actors.

## Install from the Foundry manifest

Open **Setup → Add-on Modules → Install Module** and use this manifest URL:

```text
https://raw.githubusercontent.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/main/cyren-dotmm-populator/module.json
```

Foundry must be able to access the repository and release without signing into GitHub.

## Install from the release ZIP

1. Download `cyren-dotmm-populator-0.3.0.zip` from the GitHub release.
2. Optionally download the adjacent `.sha256` file and verify the package before installation.
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
  -PackagePath ".\cyren-dotmm-populator-0.3.0.zip"
```

Use `-Force` only when replacing an existing installation. The script moves the current module into a timestamped backup directory instead of deleting it.

## Helper installer — Linux server

```bash
chmod +x installer/install.sh
./installer/install.sh \
  /home/foundry/.local/share/FoundryVTT \
  ./cyren-dotmm-populator-0.3.0.zip
```

Add `--force` as the third argument to replace an existing installation. The prior module directory is retained as a timestamped backup. If extraction or validation fails, the installer restores that prior directory automatically.

Run the script as the operating-system account that owns the Foundry user-data directory. Restart the Foundry service after installation.

## Update

Install the new ZIP over the same module ID. The helper installers preserve the previous directory when `-Force` or `--force` is used. Review the changelog before enabling a new version.

## Uninstall

Before disabling the module, open its panel on each populated Scene and use **Remove module Tokens** if those Tokens should be removed. Then disable the module and delete its directory while Foundry is stopped.

Deleting the module directory alone does not remove Tokens that were already created in a Scene.
