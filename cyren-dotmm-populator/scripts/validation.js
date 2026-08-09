import { MODULE_ID, SUPPORTED_CORE_GENERATION } from "./constants.js";

const AREA_PATTERN = /^\d{1,3}[a-z]?(?:-[a-z0-9]+)?$/i;

export function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const generation = Number(game.release?.generation ?? game.version?.split?.(".")?.[0]);

  if (generation !== SUPPORTED_CORE_GENERATION) {
    errors.push(`Foundry generation ${generation || "unknown"} is unsupported; this build targets v12.`);
  }
  if (game.system?.id !== "dnd5e") errors.push("The active system is not dnd5e.");
  if (!game.modules.get("cyrensmaps-wdmm")?.active) errors.push("CyrensMaps for Undermountain is not active.");
  if (!game.modules.get("scene-packer")?.active) warnings.push("Scene Packer is not active; imported-scene flags may be incomplete.");
  if (!game.modules.get("monks-active-tiles")?.active) warnings.push("Monk's Active Tile Triggers is inactive; Cyren teleports may not operate.");
  if (!game.modules.get("plutonium")?.active) warnings.push("Plutonium is inactive; missing Actors must be imported by another method.");

  return { ok: errors.length === 0, errors, warnings };
}

export function validateLevelData(data) {
  const errors = [];
  const warnings = [];
  const encounterIds = new Set();
  const instances = new Set();
  const width = Number(data?.scene?.width);
  const height = Number(data?.scene?.height);

  if (!Number.isInteger(data?.level) || data.level < 1) errors.push("Missing or invalid level number.");
  if (!Array.isArray(data?.encounters)) errors.push("encounters must be an array.");

  for (const encounter of data?.encounters ?? []) {
    if (!encounter.id) errors.push("Encounter without id.");
    else if (encounterIds.has(encounter.id)) errors.push(`Duplicate encounter id: ${encounter.id}`);
    else encounterIds.add(encounter.id);

    if (!AREA_PATTERN.test(encounter.area ?? "")) errors.push(`Malformed area id in ${encounter.id}: ${encounter.area}`);
    if (!Array.isArray(encounter.tokens) || !encounter.tokens.length) errors.push(`Encounter ${encounter.id} has no tokens.`);

    for (const token of encounter.tokens ?? []) {
      if (!token.actorKey) errors.push(`Missing actorKey in ${encounter.id}.`);
      if (!token.actor) errors.push(`Missing actor name in ${encounter.id}/${token.actorKey ?? "unknown"}.`);
      if (!Number.isInteger(token.count) || token.count < 1) errors.push(`Invalid count in ${encounter.id}/${token.actorKey}.`);
      if (token.tokenWidth !== undefined && (!Number.isFinite(token.tokenWidth) || token.tokenWidth <= 0)) errors.push(`Invalid tokenWidth in ${encounter.id}/${token.actorKey}.`);
      if (token.tokenHeight !== undefined && (!Number.isFinite(token.tokenHeight) || token.tokenHeight <= 0)) errors.push(`Invalid tokenHeight in ${encounter.id}/${token.actorKey}.`);
      for (let instance = 1; instance <= (token.count ?? 0); instance += 1) {
        const key = `${encounter.id}|${token.actorKey}|${instance}`;
        if (instances.has(key)) errors.push(`Duplicate token instance id: ${key}`);
        instances.add(key);
      }
    }

    if (encounter.humanReview) warnings.push(`${encounter.id} is marked for human review.`);
  }

  for (const [area, anchor] of Object.entries(data?.anchors ?? {})) {
    if (!AREA_PATTERN.test(area)) errors.push(`Malformed anchor area id: ${area}`);
    if (!Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y)) errors.push(`Invalid anchor coordinates: ${area}`);
    else if (anchor.x < 0 || anchor.y < 0 || anchor.x > width || anchor.y > height) errors.push(`Out-of-bounds anchor: ${area}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function fingerprintScene(scene) {
  const ids = (collection) => Array.from(collection ?? [], (document) => document.id).sort();
  const snapshots = (collection) => Array.from(collection ?? [], (document) => ({
    id: document.id,
    data: document.toObject?.() ?? {}
  })).sort((left, right) => left.id.localeCompare(right.id));
  return {
    sceneId: scene.id,
    tokens: ids(scene.tokens),
    walls: snapshots(scene.walls),
    lights: snapshots(scene.lights),
    tiles: snapshots(scene.tiles),
    notes: snapshots(scene.notes),
    sounds: snapshots(scene.sounds),
    drawings: snapshots(scene.drawings),
    regions: snapshots(scene.regions)
  };
}

export function verifyTokenOnlyMutation(before, after, { created = [], removed = [] } = {}) {
  const errors = [];
  for (const key of ["walls", "lights", "tiles", "notes", "sounds", "drawings", "regions"]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) errors.push(`${key} changed unexpectedly.`);
  }

  const beforeTokens = new Set(before.tokens);
  const afterTokens = new Set(after.tokens);
  const actualCreated = [...afterTokens].filter((id) => !beforeTokens.has(id)).sort();
  const actualRemoved = [...beforeTokens].filter((id) => !afterTokens.has(id)).sort();
  const expectedCreated = [...created].sort();
  const expectedRemoved = [...removed].sort();

  if (JSON.stringify(actualCreated) !== JSON.stringify(expectedCreated)) {
    errors.push(`Unexpected token creation set: ${actualCreated.join(", ") || "none"}.`);
  }
  if (JSON.stringify(actualRemoved) !== JSON.stringify(expectedRemoved)) {
    errors.push(`Unexpected token removal set: ${actualRemoved.join(", ") || "none"}.`);
  }

  return { ok: errors.length === 0, errors, actualCreated, actualRemoved };
}

export function assertGm() {
  if (!game.user?.isGM) throw new Error(`${MODULE_ID} is GM-only.`);
}
