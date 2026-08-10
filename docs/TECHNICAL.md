# Technical Notes

## Ownership boundary

Encounter population creates embedded Token documents only. Each Token is tagged under `flags.cyren-dotmm-populator` with its level, map segment, area, encounter, and deterministic population key.

Mutation functions select documents by those flags. They do not modify Actors, Walls, Lights, Tiles, Notes, Sounds, Drawings, Regions, or files belonging to CyrensMaps.

Two separate opt-in helpers can create documents outside encounter population: the safety-copy helper creates missing Scene copies, and the Actor importer copies unambiguous compendium Actors into its dedicated World folder. The copy helper never overwrites an existing copy or changes the source Scene.

## Idempotency

Each intended instance has a stable key derived from:

```text
level | sceneKey | area | encounter | actorKey | instance
```

Create operations compare expected keys with keys already present on the Scene. Running the same plan again creates no duplicates. Reconcile removes only flagged keys that no longer belong to the plan.

## Scene resolution

The resolver uses multiple independent signals:

- Scene Packer source-module metadata;
- source Scene identifier;
- normalized Scene name;
- exact width, height, padding, and grid size.

Ambiguity blocks the operation. Geometry fallback is accepted only when the expected dimensions match.

Datasets are loaded independently from `data/level-01.json` through `data/level-23.json`. Level 3 declares three Scene descriptors and assigns every anchor and encounter to a `sceneKey`. Other levels declare one Scene. The selected level is stored as a client setting, and a compatible active Scene updates that selection automatically.

## Actor resolution and import

Actors are referenced by logical keys and names, never bundled documents. The resolver supports ordered resolution names and aliases for newer equivalents, then ranks preferred source codes in this order:

```text
XMM → MPMM → MM
```

Explicit World Actor UUID overrides take precedence. World duplicates use a narrow folder tie-breaker; otherwise ambiguous matches remain blockers.

The optional importer copies only unambiguous compendium Actors into `Sier's DotMM Populator Imports`. Duplicate cleanup is restricted to redundant Actors created in that folder. The module does not package or synthesize creature stat blocks.

## Placement

Datasets may provide exact top-left token coordinates. Those coordinates are preserved, including deliberate overlap among planned instances. Exact placements must remain within the padded canvas and cannot overlap an unrelated pre-existing Token.

When exact coordinates are unavailable, placement starts from an area anchor and searches deterministic grid offsets within the configured radius. Candidate rectangles must remain inside the padded Scene bounds, avoid wall intersections, and avoid occupied Token rectangles.

## Mutation verification

Before a persistent operation, the module fingerprints Tokens and the unrelated embedded collections. After the operation it verifies:

- created and removed Token IDs match the operation result;
- non-Token collections have identical content fingerprints;
- no unowned Token was removed.

The module attempts to revert its own changes if verification fails.

## Public API

After the `ready` hook, helpers are exposed at:

```js
game.modules.get("cyren-dotmm-populator").api
```

The API includes panel opening, data loading, Scene/Actor/anchor resolution, plan generation, population, reconciliation, removal, rebuild, Actor import, safety-copy status, and missing-copy creation. Persistent calls still enforce GM and ownership checks.

## Distributed content

The package contains original code and minimal encounter/placement metadata. It does not contain adventure prose, stat blocks, maps, images, PDFs, journals, source datasets, Foundry World databases, credentials, or server diagnostics. See [Third-party notices](../THIRD_PARTY_NOTICES.md).
