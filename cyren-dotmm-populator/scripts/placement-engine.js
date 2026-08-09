import { makeTokenFlag, populationKey, getPopulationFlag } from "./flags.js";

function rectFor(x, y, width, height, grid) {
  return { x, y, width: width * grid, height: height * grid };
}

function overlaps(a, b, padding = 2) {
  return a.x < b.x + b.width - padding && a.x + a.width > b.x + padding &&
    a.y < b.y + b.height - padding && a.y + a.height > b.y + padding;
}

function wallSegments(scene) {
  return Array.from(scene.walls ?? [], (wall) => wall.c ?? wall.toObject?.().c).filter((c) => Array.isArray(c) && c.length === 4);
}

function intersectsWalls(rect, walls) {
  const edges = [
    [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }],
    [{ x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }],
    [{ x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }],
    [{ x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y }]
  ];
  return walls.some(([x1, y1, x2, y2]) => edges.some(([a, b]) =>
    foundry.utils.lineSegmentIntersects(a, b, { x: x1, y: y1 }, { x: x2, y: y2 })));
}

function spiralOffsets(radius) {
  const result = [{ x: 0, y: 0 }];
  for (let ring = 1; ring <= Math.max(1, radius); ring += 1) {
    for (let x = -ring; x <= ring; x += 1) result.push({ x, y: -ring });
    for (let y = -ring + 1; y <= ring; y += 1) result.push({ x: ring, y });
    for (let x = ring - 1; x >= -ring; x -= 1) result.push({ x, y: ring });
    for (let y = ring - 1; y > -ring; y -= 1) result.push({ x: -ring, y });
  }
  return result;
}

function snap(value, grid) {
  return Math.round(value / grid) * grid;
}

function tokenDimensions(actor, spec = {}) {
  const proto = actor.prototypeToken ?? {};
  return {
    width: Number(spec.tokenWidth ?? proto.width ?? 1),
    height: Number(spec.tokenHeight ?? proto.height ?? 1)
  };
}

function existingRects(scene, { ignoreModuleTokens = false } = {}) {
  const grid = Number(scene.grid.size);
  return Array.from(scene.tokens ?? [])
    .filter((token) => !ignoreModuleTokens || !getPopulationFlag(token))
    .map((token) => ({
      ...rectFor(Number(token.x), Number(token.y), Number(token.width ?? 1), Number(token.height ?? 1), grid),
      id: token.id,
      module: Boolean(getPopulationFlag(token))
    }));
}

function findPosition({ scene, anchor, actor, spec, radius, occupied, allowStack }) {
  const grid = Number(scene.grid.size);
  const dims = tokenDimensions(actor, spec);
  const walls = wallSegments(scene);
  const maxX = Number(scene.width) - dims.width * grid;
  const maxY = Number(scene.height) - dims.height * grid;
  for (const offset of spiralOffsets(radius)) {
    const x = snap(anchor.x - (dims.width * grid) / 2 + offset.x * grid, grid);
    const y = snap(anchor.y - (dims.height * grid) / 2 + offset.y * grid, grid);
    const rect = rectFor(x, y, dims.width, dims.height, grid);
    if (x < 0 || y < 0 || x > maxX || y > maxY) continue;
    if (!allowStack && occupied.some((other) => overlaps(rect, other))) continue;
    if (intersectsWalls(rect, walls)) continue;
    return { x, y, width: dims.width, height: dims.height, rect };
  }
  return null;
}

export function expectedPopulationKeys(levelData) {
  const keys = new Set();
  for (const encounter of levelData.encounters ?? []) {
    for (const token of encounter.tokens ?? []) {
      for (let instance = 1; instance <= token.count; instance += 1) {
        keys.add(populationKey(makeTokenFlag({ level: levelData.level, area: encounter.area, encounterId: encounter.id, actorKey: token.actorKey, instance })));
      }
    }
  }
  return keys;
}

export function planPopulation(scene, levelData, actors, anchors, { areas = null, ignoreExisting = false } = {}) {
  const wantedAreas = areas ? new Set(Array.from(areas, (area) => String(area).toLowerCase())) : null;
  const existing = new Map();
  for (const token of scene.tokens ?? []) {
    const key = populationKey(getPopulationFlag(token));
    if (key && !ignoreExisting) existing.set(key, token);
  }
  const occupied = existingRects(scene, { ignoreModuleTokens: ignoreExisting });
  const placements = [];
  const skipped = [];
  const warnings = [];
  const encounterPlacements = new Map();

  for (const encounter of levelData.encounters ?? []) {
    if (wantedAreas && !wantedAreas.has(encounter.area.toLowerCase())) continue;
    const anchor = anchors.get(encounter.area.toLowerCase());
    if (anchor?.status !== "resolved") {
      skipped.push({ encounterId: encounter.id, area: encounter.area, reason: `anchor-${anchor?.status ?? "unresolved"}` });
      continue;
    }
    const byActor = new Map();
    encounterPlacements.set(encounter.id, byActor);
    for (const spec of encounter.tokens) {
      const resolution = actors.get(spec.actorKey);
      if (resolution?.status !== "resolved" || !resolution.document) {
        skipped.push({ encounterId: encounter.id, area: encounter.area, actorKey: spec.actorKey, reason: `actor-${resolution?.status ?? "unresolved"}` });
        continue;
      }
      const placedForActor = [];
      byActor.set(spec.actorKey, placedForActor);
      for (let instance = 1; instance <= spec.count; instance += 1) {
        const flag = makeTokenFlag({ level: levelData.level, area: encounter.area, encounterId: encounter.id, actorKey: spec.actorKey, instance });
        const key = populationKey(flag);
        if (existing.has(key)) {
          skipped.push({ encounterId: encounter.id, area: encounter.area, actorKey: spec.actorKey, instance, reason: "already-present", tokenId: existing.get(key).id });
          continue;
        }

        let position;
        if (spec.stackWith) {
          const host = byActor.get(spec.stackWith)?.[instance - 1] ?? byActor.get(spec.stackWith)?.[0];
          if (!host) {
            skipped.push({ encounterId: encounter.id, area: encounter.area, actorKey: spec.actorKey, instance, reason: "stack-host-unavailable" });
            continue;
          }
          position = { x: host.x, y: host.y, width: host.width, height: host.height, rect: host.rect };
        } else {
          position = findPosition({ scene, anchor, actor: resolution.document, spec, radius: encounter.radius ?? anchor.radius ?? 4, occupied, allowStack: spec.allowStack });
        }
        if (!position) {
          skipped.push({ encounterId: encounter.id, area: encounter.area, actorKey: spec.actorKey, instance, reason: "no-collision-free-position" });
          continue;
        }
        const placement = { key, flag, encounter, spec, actor: resolution.document, actorResolution: resolution, anchor, instance, ...position };
        placements.push(placement);
        placedForActor.push(placement);
        if (!spec.stackWith) occupied.push(position.rect);
      }
    }
    if (encounter.humanReview) warnings.push({ encounterId: encounter.id, area: encounter.area, reason: "human-review" });
    if (encounter.conditional) warnings.push({ encounterId: encounter.id, area: encounter.area, reason: "conditional" });
  }
  return { placements, skipped, warnings, existing, expectedKeys: expectedPopulationKeys(levelData), encounterPlacements };
}
