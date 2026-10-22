import { CYREN_MODULE_ID } from "./constants.js";

function normalizeSceneName(name) {
  return String(name ?? "").toLowerCase().replace(/\s*\(copy(?:\s+\d+)?\)\s*$/i, "").trim();
}

function sceneSourceModule(scene) {
  return scene.flags?.["scene-packer"]?.["source-module"]
    ?? scene.flags?.["scene-packer"]?.sourceModule
    ?? null;
}

function sceneSourceId(scene) {
  return scene.flags?.["scene-packer"]?.sourceId ?? null;
}

export function levelSceneDefinitions(levelData) {
  const definitions = Array.isArray(levelData?.scenes) && levelData.scenes.length
    ? levelData.scenes
    : levelData?.scene ? [{ key: "main", ...levelData.scene }] : [];
  return definitions.map((definition, index) => ({
    ...definition,
    key: String(definition.key ?? (definitions.length === 1 ? "main" : `part-${index + 1}`))
  }));
}

export function scoreScene(scene, expected) {
  const reasons = [];
  let score = 0;
  const sourceIdMatch = Boolean(expected.sourceId) && sceneSourceId(scene) === expected.sourceId;
  const nameMatch = (expected.names ?? []).map(normalizeSceneName).includes(normalizeSceneName(scene.name));
  const geometryMatch = isExactSceneGeometry(scene, expected);

  if (sceneSourceModule(scene) === CYREN_MODULE_ID) {
    score += 100;
    reasons.push("scene-packer source module");
  }
  if (sourceIdMatch) {
    score += 80;
    reasons.push("scene-packer source id");
  }
  if (scene.flags?.[CYREN_MODULE_ID]) {
    score += 40;
    reasons.push("Cyren flags");
  }
  if (nameMatch) {
    score += 30;
    reasons.push("normalized name");
  }
  if (scene.width === expected.width && scene.height === expected.height) {
    score += 20;
    reasons.push("dimensions");
  }
  if ((scene.grid?.size ?? scene.grid) === expected.grid) {
    score += 10;
    reasons.push("grid");
  }
  // Cyren provenance alone identifies the module, not the specific map. Token
  // placement is safe only when the Scene geometry matches and either its
  // source identity or normalized name identifies this exact map.
  return { scene, score, reasons, valid: geometryMatch && (sourceIdMatch || nameMatch) };
}

export function resolveScene(expected, preferredScene = canvas?.scene) {
  if (preferredScene) {
    const preferred = scoreScene(preferredScene, expected);
    if (preferred.valid) return { status: "resolved", ...preferred, candidates: [preferred] };
  }

  const candidates = game.scenes.contents
    .map((scene) => scoreScene(scene, expected))
    .filter((candidate) => candidate.valid)
    .sort((a, b) => b.score - a.score || a.scene.name.localeCompare(b.scene.name));

  if (!candidates.length) return { status: "unresolved", scene: null, score: 0, reasons: [], candidates: [] };
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return { status: "ambiguous", scene: null, score: candidates[0].score, reasons: [], candidates };
  }
  return { status: "resolved", ...candidates[0], candidates };
}

export function scoreLevelScene(scene, levelData) {
  const candidates = levelSceneDefinitions(levelData)
    .map((definition) => ({ definition, ...scoreScene(scene, definition) }))
    .sort((left, right) => right.score - left.score || left.definition.key.localeCompare(right.definition.key));
  return candidates[0] ?? { definition: null, scene, score: 0, reasons: [], valid: false };
}

export function resolveLevelScene(levelData, preferredScene = canvas?.scene) {
  const definitions = levelSceneDefinitions(levelData);
  if (preferredScene) {
    const preferred = scoreLevelScene(preferredScene, levelData);
    if (preferred.valid) return { status: "resolved", ...preferred, candidates: [preferred] };
  }

  const candidates = definitions
    .flatMap((definition) => game.scenes.contents.map((scene) => ({ definition, ...scoreScene(scene, definition) })))
    .filter((candidate) => candidate.valid)
    .sort((left, right) => right.score - left.score
      || left.definition.key.localeCompare(right.definition.key)
      || left.scene.name.localeCompare(right.scene.name));
  if (!candidates.length) return { status: "unresolved", scene: null, definition: null, score: 0, reasons: [], candidates: [] };
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return { status: "ambiguous", scene: null, definition: null, score: candidates[0].score, reasons: [], candidates };
  }
  return { status: "resolved", ...candidates[0], candidates };
}

export function scopeLevelData(levelData, sceneKey) {
  const definitions = levelSceneDefinitions(levelData);
  const definition = definitions.find((candidate) => candidate.key === sceneKey);
  if (!definition) throw new Error(`Unknown Scene key for ${levelData.contentId ?? `Level ${levelData.level}`}: ${sceneKey}`);
  const defaultKey = definitions[0]?.key ?? "main";
  const belongsToScene = (value) => String(value?.sceneKey ?? defaultKey) === sceneKey;
  return {
    ...levelData,
    scene: definition,
    activeSceneKey: sceneKey,
    encounters: (levelData.encounters ?? []).filter(belongsToScene),
    anchors: Object.fromEntries(Object.entries(levelData.anchors ?? {}).filter(([, anchor]) => belongsToScene(anchor)))
  };
}

export function isExactSceneGeometry(scene, expected) {
  return scene.width === expected.width
    && scene.height === expected.height
    && (scene.grid?.size ?? scene.grid) === expected.grid
    && (expected.padding === undefined || Number(scene.padding ?? 0) === Number(expected.padding));
}

export function expectedCanvasBounds(expected) {
  const padding = Number(expected?.padding ?? 0);
  return {
    width: Number(expected?.canvasWidth ?? Number(expected?.width) * (1 + 2 * padding)),
    height: Number(expected?.canvasHeight ?? Number(expected?.height) * (1 + 2 * padding))
  };
}

export function sceneCanvasBounds(scene) {
  const dimensions = scene?.dimensions ?? {};
  const padding = Number(scene?.padding ?? 0);
  return {
    width: Number(dimensions.width ?? Number(scene?.width) * (1 + 2 * padding)),
    height: Number(dimensions.height ?? Number(scene?.height) * (1 + 2 * padding))
  };
}
