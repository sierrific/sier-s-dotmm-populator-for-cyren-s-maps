# Technical Notes

## Ownership boundary

The module creates embedded Token documents only. Each Token is tagged under `flags.cyren-dotmm-populator` with its level, area, encounter, and deterministic population key.

Mutation functions select documents by those flags. They do not modify Actors, Walls, Lights, Tiles, Notes, Sounds, Drawings, Regions, or the source module's files.

## Idempotency

Each intended instance has a stable key derived from:

```text
level | area | encounter | actorKey | instance
```

Create operations compare expected keys with keys already present on the Scene. Running the same plan again creates no duplicates. Reconcile removes only flagged keys that no longer belong to the plan.

## Scene resolution

The resolver uses multiple independent signals:

- Scene Packer source-module metadata;
- source Scene identifier;
- normalized Scene name;
- exact width, height, and grid size.

Ambiguity blocks the operation. Geometry fallback is accepted only when all expected dimensions match.

Level datasets are loaded independently from `data/level-01.json` and `data/level-02.json`. The selected level is stored as a client setting, and a compatible active Scene can update that selection automatically.

## Actor resolution

Actors are referenced by logical keys and names, never bundled documents. The resolver supports ordered resolution names and aliases for newer equivalents, then ranks preferred source codes in this order:

```text
XMM → MPMM → MM
```

Explicit World Actor UUID overrides take precedence. Ambiguous matches remain blockers until a GM chooses an override.

## Placement

Placement starts from an area anchor and searches deterministic grid offsets within the configured radius. Candidate rectangles must remain inside Scene bounds, avoid wall intersections, and avoid occupied Token rectangles. Deliberate stacking is allowed only for metadata that explicitly requests it.

## Mutation verification

Before a persistent operation, the module fingerprints Tokens and the unrelated embedded collections. After the operation it verifies:

- created and removed Token IDs match the operation result;
- non-Token collections have identical fingerprints;
- no unowned Token was removed.

The module attempts to revert its own changes if verification fails.

## Public API

After the `ready` hook, the module exposes helpers at:

```js
game.modules.get("cyren-dotmm-populator").api
```

The API includes panel opening, data loading, Scene/Actor/anchor resolution, plan generation, population, reconciliation, removal, and rebuild operations. Persistent calls still enforce the module's GM and ownership checks.

## Distributed content

The package contains original code and minimal encounter/placement metadata. It does not contain adventure prose, stat blocks, maps, images, PDFs, journals, or source datasets.
