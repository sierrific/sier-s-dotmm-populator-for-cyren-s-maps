#!/usr/bin/env bash
set -euo pipefail

module_id="cyren-dotmm-populator"
foundry_data="${1:-}"
package_path="${2:-}"
force="${3:-}"

if [[ -z "$foundry_data" || -z "$package_path" ]]; then
  echo "Usage: $0 <FoundryUserData> <release-zip> [--force]" >&2
  exit 2
fi

if [[ ! -d "$foundry_data" ]]; then
  echo "Foundry user-data directory does not exist: $foundry_data" >&2
  exit 2
fi

if [[ ! -f "$package_path" || "${package_path##*.}" != "zip" ]]; then
  echo "Release ZIP does not exist: $package_path" >&2
  exit 2
fi

modules_directory="$foundry_data/Data/modules"
target="$modules_directory/$module_id"
mkdir -p "$modules_directory"

if [[ -e "$target" ]]; then
  if [[ "$force" != "--force" ]]; then
    echo "The module is already installed. Re-run with --force to preserve it as a backup." >&2
    exit 3
  fi

  backup="$modules_directory/$module_id.backup-$(date +%Y%m%d-%H%M%S)"
  mv -- "$target" "$backup"
  echo "Existing module moved to $backup"
fi

staging_root="$(mktemp -d "${TMPDIR:-/tmp}/$module_id.XXXXXXXX")"
cleanup() {
  rm -rf -- "$staging_root"
}
trap cleanup EXIT

unzip -q -- "$package_path" -d "$staging_root"
if [[ ! -f "$staging_root/module.json" ]]; then
  echo "The ZIP does not contain module.json at its root." >&2
  exit 4
fi

if ! grep -Eq '"id"[[:space:]]*:[[:space:]]*"cyren-dotmm-populator"' "$staging_root/module.json"; then
  echo "The ZIP contains an unexpected module id." >&2
  exit 4
fi

mv -- "$staging_root" "$target"
trap - EXIT
echo "Installed $module_id to $target"
