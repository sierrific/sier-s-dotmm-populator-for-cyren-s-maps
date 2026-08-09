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

export function scoreScene(scene, expected) {
  const reasons = [];
  let score = 0;

  if (sceneSourceModule(scene) === CYREN_MODULE_ID) {
    score += 100;
    reasons.push("scene-packer source module");
  }
  if (sceneSourceId(scene) === expected.sourceId) {
    score += 80;
    reasons.push("scene-packer source id");
  }
  if (scene.flags?.[CYREN_MODULE_ID]) {
    score += 40;
    reasons.push("Cyren flags");
  }
  if ((expected.names ?? []).map(normalizeSceneName).includes(normalizeSceneName(scene.name))) {
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
  return { scene, score, reasons, valid: score >= 60 };
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

export function isExactSceneGeometry(scene, expected) {
  return scene.width === expected.width
    && scene.height === expected.height
    && (scene.grid?.size ?? scene.grid) === expected.grid;
}
