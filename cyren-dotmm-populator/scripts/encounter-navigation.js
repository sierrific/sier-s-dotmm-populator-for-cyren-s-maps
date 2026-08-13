import { flagMatchesContent, getPopulationFlag } from "./flags.js";

function centerOfRect(x, y, width, height, grid) {
  return {
    x: Number(x) + (Number(width ?? 1) * grid) / 2,
    y: Number(y) + (Number(height ?? 1) * grid) / 2
  };
}

function centroid(points, source) {
  if (!points.length) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    count: points.length,
    source
  };
}

export function encounterFocusPoint({ scene, contentId = null, level = null, encounter, plan = null, anchor = null }) {
  const grid = Number(scene.grid?.size ?? scene.grid);
  const existing = Array.from(scene.tokens ?? [])
    .filter((token) => {
      const flag = getPopulationFlag(token);
      return flagMatchesContent(flag, { contentId, level }) && flag.encounterId === encounter.id;
    })
    .map((token) => centerOfRect(token.x, token.y, token.width, token.height, grid));
  const existingPoint = centroid(existing, "existing-tokens");
  if (existingPoint) return existingPoint;

  const planned = [];
  for (const actorPlacements of plan?.encounterPlacements?.get(encounter.id)?.values?.() ?? []) {
    for (const placement of actorPlacements.values()) {
      planned.push(centerOfRect(placement.x, placement.y, placement.width, placement.height, grid));
    }
  }
  const plannedPoint = centroid(planned, "planned-tokens");
  if (plannedPoint) return plannedPoint;

  const exact = [];
  for (const token of encounter.tokens ?? []) {
    for (const position of token.positions ?? []) {
      exact.push(centerOfRect(
        position.x,
        position.y,
        position.width ?? token.tokenWidth,
        position.height ?? token.tokenHeight,
        grid
      ));
    }
  }
  const exactPoint = centroid(exact, "exact-positions");
  if (exactPoint) return exactPoint;

  if (anchor?.status === "resolved" && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
    return { x: Number(anchor.x), y: Number(anchor.y), count: 1, source: "area-anchor" };
  }
  return null;
}

export async function panToEncounter({ scene, contentId = null, level = null, encounter, plan = null, anchor = null }) {
  const point = encounterFocusPoint({ scene, contentId, level, encounter, plan, anchor });
  if (!point) throw new Error(`No navigable position is available for ${encounter.id}.`);

  if (!canvas?.ready || canvas.scene?.id !== scene.id) await scene.view();
  if (!canvas?.ready || canvas.scene?.id !== scene.id) throw new Error(`Unable to view ${scene.name}.`);
  await canvas.animatePan({ x: point.x, y: point.y, duration: 500 });
  return point;
}
