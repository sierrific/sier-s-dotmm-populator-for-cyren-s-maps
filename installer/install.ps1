[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$FoundryUserData,

    [Parameter(Mandatory = $true)]
    [string]$PackagePath,

    [switch]$Force
)

$ErrorActionPreference = "Stop"
$moduleId = "cyren-dotmm-populator"
$resolvedData = (Resolve-Path -LiteralPath $FoundryUserData).Path
$resolvedPackage = (Resolve-Path -LiteralPath $PackagePath).Path
$modulesDirectory = Join-Path $resolvedData "Data\modules"
$target = Join-Path $modulesDirectory $moduleId

if ([IO.Path]::GetExtension($resolvedPackage) -ne ".zip") {
    throw "PackagePath must point to a release ZIP."
}

New-Item -ItemType Directory -Force -Path $modulesDirectory | Out-Null

if (Test-Path -LiteralPath $target) {
    if (-not $Force) {
        throw "The module is already installed. Re-run with -Force to preserve it as a backup and install this package."
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = Join-Path $modulesDirectory "$moduleId.backup-$stamp"
    Move-Item -LiteralPath $target -Destination $backup
    Write-Host "Existing module moved to $backup"
}

$stagingRoot = Join-Path ([IO.Path]::GetTempPath()) "$moduleId-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stagingRoot | Out-Null

try {
    Expand-Archive -LiteralPath $resolvedPackage -DestinationPath $stagingRoot
    $manifest = Join-Path $stagingRoot "module.json"
    if (-not (Test-Path -LiteralPath $manifest)) {
        throw "The ZIP does not contain module.json at its root."
    }

    $metadata = Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json
    if ($metadata.id -ne $moduleId) {
        throw "Unexpected module id: $($metadata.id)"
    }

    Move-Item -LiteralPath $stagingRoot -Destination $target
    Write-Host "Installed $($metadata.title) $($metadata.version) to $target"
} finally {
    if (Test-Path -LiteralPath $stagingRoot) {
        Remove-Item -Recurse -Force -LiteralPath $stagingRoot
    }
}
