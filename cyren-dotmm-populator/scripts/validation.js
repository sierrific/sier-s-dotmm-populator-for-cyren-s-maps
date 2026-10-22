import { MODULE_ID, SUPPORTED_CORE_GENERATIONS } from "./constants.js";
import { coreGeneration } from "./compatibility.js";
import { expectedCanvasBounds, levelSceneDefinitions } from "./scene-resolver.js";

const AREA_PATTERN = /^(?:\d{1,3}[a-z]?(?:-[a-z0-9]+)?|[a-z][a-z0-9-]{0,63})$/i;

export function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const generation = coreGeneration();

  if (!SUPPORTED_CORE_GENERATIONS.includes(generation)) {
    errors.push(`Foundry generation ${generation || "unknown"} is unsupported; this build supports v12–v14.`);
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
  const scenes = levelSceneDefinitions(data);
  const sceneKeys = new Set();
  const defaultSceneKey = scenes[0]?.key ?? "main";

  const hasLevel = Number.isInteger(data?.level) && data.level >= 1;
  const hasContentId = typeof data?.contentId === "string" && /^[a-z0-9][a-z0-9-]*$/.test(data.contentId);
  if (!hasLevel && !hasContentId) errors.push("Missing a valid level number or content id.");
  if (data?.level !== undefined && !hasLevel) errors.push("Invalid level number.");
  if (!Array.isArray(data?.encounters)) errors.push("encounters must be an array.");
  if (!scenes.length) errors.push("At least one Scene definition is required.");
  for (const scene of scenes) {
    if (sceneKeys.has(scene.key)) errors.push(`Duplicate Scene key: ${scene.key}`);
    sceneKeys.add(scene.key);
    if (!Array.isArray(scene.names) || !scene.names.length) errors.push(`Scene ${scene.key} has no names.`);
    if (!Number.isFinite(Number(scene.width)) || !Number.isFinite(Number(scene.height))) errors.push(`Scene ${scene.key} has invalid dimensions.`);
    if (!Number.isFinite(Number(scene.grid)) || Number(scene.grid) <= 0) errors.push(`Scene ${scene.key} has an invalid grid.`);
  }

  for (const encounter of data?.encounters ?? []) {
    if (!encounter.id) errors.push("Encounter without id.");
    else if (encounterIds.has(encounter.id)) errors.push(`Duplicate encounter id: ${encounter.id}`);
    else encounterIds.add(encounter.id);

    if (!AREA_PATTERN.test(encounter.area ?? "")) errors.push(`Malformed area id in ${encounter.id}: ${encounter.area}`);
    if (!Array.isArray(encounter.tokens) || !encounter.tokens.length) errors.push(`Encounter ${encounter.id} has no tokens.`);
    if (encounter.radius !== undefined && (!Number.isInteger(encounter.radius) || encounter.radius < 0)) errors.push(`Invalid radius in ${encounter.id}.`);
    const encounterSceneKey = String(encounter.sceneKey ?? defaultSceneKey);
    if (!sceneKeys.has(encounterSceneKey)) errors.push(`Unknown Scene key in ${encounter.id}: ${encounterSceneKey}`);

    const actorKeys = new Set();
    for (const token of encounter.tokens ?? []) {
      if (!token.actorKey) errors.push(`Missing actorKey in ${encounter.id}.`);
      else if (actorKeys.has(token.actorKey)) errors.push(`Duplicate actorKey in ${encounter.id}: ${token.actorKey}`);
      if (!token.actor) errors.push(`Missing actor name in ${encounter.id}/${token.actorKey ?? "unknown"}.`);
      if (!Number.isInteger(token.count) || token.count < 1) errors.push(`Invalid count in ${encounter.id}/${token.actorKey}.`);
      for (const field of ["aliases", "resolutionNames"]) {
        if (token[field] !== undefined && (!Array.isArray(token[field]) || token[field].some((value) => typeof value !== "string" || !value.trim()))) {
          errors.push(`${field} must contain non-empty strings in ${encounter.id}/${token.actorKey}.`);
        }
      }
      if (token.stackWith && !actorKeys.has(token.stackWith)) errors.push(`stackWith must reference an earlier actorKey in ${encounter.id}/${token.actorKey}.`);
      if (token.disposition !== undefined && ![-1, 0, 1].includes(token.disposition)) errors.push(`Invalid disposition in ${encounter.id}/${token.actorKey}.`);
      if (token.hidden !== undefined && typeof token.hidden !== "boolean") errors.push(`Invalid hidden flag in ${encounter.id}/${token.actorKey}.`);
      if (token.tokenName !== undefined && (typeof token.tokenName !== "string" || !token.tokenName.trim())) errors.push(`Invalid tokenName in ${encounter.id}/${token.actorKey}.`);
      if (token.tokenWidth !== undefined && (!Number.isFinite(token.tokenWidth) || token.tokenWidth <= 0)) errors.push(`Invalid tokenWidth in ${encounter.id}/${token.actorKey}.`);
      if (token.tokenHeight !== undefined && (!Number.isFinite(token.tokenHeight) || token.tokenHeight <= 0)) errors.push(`Invalid tokenHeight in ${encounter.id}/${token.actorKey}.`);
      if (token.positions !== undefined && (!Array.isArray(token.positions) || token.positions.length !== token.count)) errors.push(`positions must contain exactly count entries in ${encounter.id}/${token.actorKey}.`);
      for (const position of token.positions ?? []) {
        if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) errors.push(`Invalid exact position in ${encounter.id}/${token.actorKey}.`);
        if (position?.width !== undefined && (!Number.isFinite(position.width) || position.width <= 0)) errors.push(`Invalid exact-position width in ${encounter.id}/${token.actorKey}.`);
        if (position?.height !== undefined && (!Number.isFinite(position.height) || position.height <= 0)) errors.push(`Invalid exact-position height in ${encounter.id}/${token.actorKey}.`);
      }
      for (let instance = 1; instance <= (token.count ?? 0); instance += 1) {
        const key = `${encounter.id}|${token.actorKey}|${instance}`;
        if (instances.has(key)) errors.push(`Duplicate token instance id: ${key}`);
        instances.add(key);
      }
      actorKeys.add(token.actorKey);
    }

    if (encounter.humanReview) warnings.push(`${encounter.id} is marked for human review.`);
  }

  for (const [area, anchor] of Object.entries(data?.anchors ?? {})) {
    if (!AREA_PATTERN.test(area)) errors.push(`Malformed anchor area id: ${area}`);
    const anchorSceneKey = String(anchor?.sceneKey ?? defaultSceneKey);
    const scene = scenes.find((candidate) => candidate.key === anchorSceneKey);
    if (!scene) errors.push(`Unknown Scene key for anchor ${area}: ${anchorSceneKey}`);
    if (!Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y)) errors.push(`Invalid anchor coordinates: ${area}`);
    else if (scene) {
      const bounds = expectedCanvasBounds(scene);
      if (anchor.x < 0 || anchor.y < 0 || anchor.x > bounds.width || anchor.y > bounds.height) errors.push(`Out-of-bounds anchor: ${area}`);
    }
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
    tokenSnapshots: snapshots(scene.tokens),
    walls: snapshots(scene.walls),
    lights: snapshots(scene.lights),
    tiles: snapshots(scene.tiles),
    notes: snapshots(scene.notes),
    sounds: snapshots(scene.sounds),
    drawings: snapshots(scene.drawings),
    regions: snapshots(scene.regions),
    levels: snapshots(scene.levels)
  };
}

export function verifyTokenOnlyMutation(before, after, { created = [], removed = [] } = {}) {
  const errors = [];
  for (const key of ["walls", "lights", "tiles", "notes", "sounds", "drawings", "regions", "levels"]) {
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

  const beforeSnapshots = new Map((before.tokenSnapshots ?? []).map((entry) => [entry.id, entry.data]));
  const afterSnapshots = new Map((after.tokenSnapshots ?? []).map((entry) => [entry.id, entry.data]));
  const changed = [...beforeSnapshots.keys()].filter((id) => afterSnapshots.has(id)
    && JSON.stringify(beforeSnapshots.get(id)) !== JSON.stringify(afterSnapshots.get(id)));
  if (changed.length) errors.push(`Existing Tokens changed unexpectedly: ${changed.sort().join(", ")}.`);

  return { ok: errors.length === 0, errors, actualCreated, actualRemoved, changed };
}

export function assertGm() {
  if (!game.user?.isGM) throw new Error(`${MODULE_ID} is GM-only.`);
}
