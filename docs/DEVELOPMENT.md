# Development and releases

## Repository layout

```text
cyren-dotmm-populator/  Foundry-ready module source
docs/                   User and technical documentation
installer/              Optional local installation helpers
tools/                  Validation, tests, and packaging
```

## Local checks

Node.js 20 or newer is recommended.

```bash
npm install
npm run validate
npm test
npm run build
```

`npm run build` creates `dist/cyren-dotmm-populator-<version>.zip`. The archive contains the contents of the module directory at its root, including `module.json`.

## Release procedure

1. Update `version` and `download` in `cyren-dotmm-populator/module.json`.
2. Add the release notes to `CHANGELOG.md`.
3. Run validation, tests, and the package build.
4. Create and push a tag named `v<version>`.
5. The release workflow repeats the checks, builds the package, and publishes the ZIP and installer scripts as GitHub release assets.

The manifest version, tag, archive name, and download URL must match exactly.

## Content boundary

Do not commit source adventure files, extracted prose, journals, stat blocks, maps, token artwork, PDFs, Foundry World databases, credentials, or server-specific diagnostics. Encounter data must remain limited to the metadata required by the placement engine.
