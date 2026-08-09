import { MODULE_ID, SETTINGS } from "./constants.js";
import { isExactSceneGeometry } from "./scene-resolver.js";

const NUMBER_TILE_PATTERN = /(?:number%20tokens|number tokens)\/(?:numbered-_0001s_\d+_)?(\d{1,3}[a-z]?)\.webp(?:\?.*)?$/i;

export function areaFromTile(tile) {
  const src = tile.texture?.src ?? tile.img ?? "";
  return src.match(NUMBER_TILE_PATTERN)?.[1]?.toLowerCase() ?? null;
}

export function tileAnchor(tile) {
  return {
    x: Number(tile.x) + Number(tile.width) / 2,
    y: Number(tile.y) + Number(tile.height) / 2,
    radius: null,
    source: "cyren-tile",
    tileId: tile.id
  };
}

function manualForScene(scene) {
  const all = game.settings.get(MODULE_ID, SETTINGS.manualAnchors) ?? {};
  return all[scene.uuid] ?? all[scene.id] ?? {};
}

export function resolveAnchors(scene, levelData) {
  const discovered = new Map();
  const ambiguous = new Map();

  for (const tile of scene.tiles ?? []) {
    const area = areaFromTile(tile);
    if (!area) continue;
    const anchor = tileAnchor(tile);
    if (discovered.has(area)) {
      ambiguous.set(area, [discovered.get(area), anchor]);
      discovered.delete(area);
    } else if (ambiguous.has(area)) {
      ambiguous.get(area).push(anchor);
    } else {
      discovered.set(area, anchor);
    }
  }

  const manual = manualForScene(scene);
  const results = new Map();
  const usedAreas = new Set(levelData.encounters.map((encounter) => encounter.area.toLowerCase()));
  for (const area of usedAreas) {
    if (ambiguous.has(area)) {
      results.set(area, { status: "ambiguous", area, candidates: ambiguous.get(area) });
      continue;
    }
    if (discovered.has(area)) {
      results.set(area, { status: "resolved", area, ...discovered.get(area) });
      continue;
    }
    if (manual[area]) {
      results.set(area, { status: "resolved", area, ...manual[area], source: "manual" });
      continue;
    }
    if (isExactSceneGeometry(scene, levelData.scene) && levelData.anchors?.[area]) {
      results.set(area, { status: "resolved", area, ...levelData.anchors[area], radius: null, source: "verified-fallback" });
      continue;
    }
    results.set(area, { status: "unresolved", area });
  }

  return results;
}

export async function saveManualAnchor(scene, area, anchor) {
  const normalized = String(area).trim().toLowerCase();
  const all = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.manualAnchors) ?? {});
  all[scene.uuid] ??= {};
  all[scene.uuid][normalized] = {
    x: Number(anchor.x),
    y: Number(anchor.y),
    radius: Number(anchor.radius ?? 0) || null
  };
  await game.settings.set(MODULE_ID, SETTINGS.manualAnchors, all);
  return all[scene.uuid][normalized];
}

export { NUMBER_TILE_PATTERN };
