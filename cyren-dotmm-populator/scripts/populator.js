import { MODULE_ID } from "./constants.js";
import { flagMatchesContent, getPopulationFlag, isModuleToken, populationKey } from "./flags.js";
import { fingerprintScene, verifyTokenOnlyMutation, assertGm } from "./validation.js";
import { sceneLevelData } from "./compatibility.js";

async function tokenDataForPlacement(scene, placement) {
  const levelData = sceneLevelData(scene);
  const token = await placement.actor.getTokenDocument({
    x: placement.x,
    y: placement.y,
    hidden: Boolean(placement.spec.hidden),
    disposition: Number(placement.spec.disposition ?? -1),
    ...levelData
  }, { parent: scene });
  const data = token.toObject();
  delete data._id;
  Object.assign(data, levelData);
  data.x = placement.x;
  data.y = placement.y;
  data.hidden = Boolean(placement.spec.hidden);
  data.disposition = Number(placement.spec.disposition ?? -1);
  data.width = Number(placement.width ?? placement.spec.tokenWidth ?? data.width);
  data.height = Number(placement.height ?? placement.spec.tokenHeight ?? data.height);
  if (placement.spec.tokenName) data.name = placement.spec.tokenName;
  data.flags ??= {};
  data.flags[MODULE_ID] = placement.flag;
  return data;
}

async function createPlacements(scene, placements) {
  if (!placements.length) return [];
  const data = [];
  for (const placement of placements) data.push(await tokenDataForPlacement(scene, placement));
  return scene.createEmbeddedDocuments("Token", data);
}

async function deleteModuleTokens(scene, tokens) {
  const safe = Array.from(tokens).filter((token) => token.parent?.id === scene.id && isModuleToken(token));
  if (!safe.length) return [];
  await scene.deleteEmbeddedDocuments("Token", safe.map((token) => token.id));
  return safe;
}

async function rollbackPartialMutation(scene, before) {
  const errors = [];
  const beforeIds = new Set(before.tokens ?? []);
  try {
    const created = Array.from(scene.tokens ?? []).filter((token) => !beforeIds.has(token.id) && isModuleToken(token));
    if (created.length) await scene.deleteEmbeddedDocuments("Token", created.map((token) => token.id));
  } catch (error) {
    errors.push(`created-token rollback failed: ${error.message}`);
  }

  try {
    const currentIds = new Set(Array.from(scene.tokens ?? [], (token) => token.id));
    const missing = (before.tokenSnapshots ?? []).filter((entry) => !currentIds.has(entry.id));
    if (missing.length) {
      const data = missing.map((entry) => ({ ...entry.data, _id: entry.id }));
      await scene.createEmbeddedDocuments("Token", data, { keepId: true });
    }
  } catch (error) {
    errors.push(`removed-token restore failed: ${error.message}`);
  }
  return errors;
}

async function verifiedMutation(scene, operation) {
  assertGm();
  sceneLevelData(scene);
  const before = fingerprintScene(scene);
  let result;
  try {
    result = await operation();
  } catch (error) {
    const rollbackErrors = await rollbackPartialMutation(scene, before);
    const detail = rollbackErrors.length ? ` Rollback: ${rollbackErrors.join(" ")}` : " Partial changes were rolled back.";
    throw new Error(`${error.message}${detail}`, { cause: error });
  }
  const after = fingerprintScene(scene);
  const verification = verifyTokenOnlyMutation(before, after, {
    created: result.created?.map((token) => token.id) ?? [],
    removed: result.removed?.map((token) => token.id) ?? []
  });
  if (!verification.ok) {
    const rollbackErrors = await rollbackPartialMutation(scene, before);
    throw new Error(`Safety verification failed: ${verification.errors.join(" ")}${rollbackErrors.length ? ` Rollback: ${rollbackErrors.join(" ")}` : " Changes were rolled back."}`);
  }
  return { ...result, verification };
}

export async function populateMissing(scene, plan) {
  return verifiedMutation(scene, async () => ({ created: await createPlacements(scene, plan.placements), removed: [] }));
}

export async function removeCreated(scene, { contentId = null, level = null, areas = null } = {}) {
  const selected = areas ? new Set(Array.from(areas, (area) => String(area).toLowerCase())) : null;
  const tokens = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    if (!flag) return false;
    if ((contentId || level !== null) && !flagMatchesContent(flag, { contentId, level })) return false;
    return !selected || selected.has(String(flag.area).toLowerCase());
  });
  return verifiedMutation(scene, async () => ({ created: [], removed: await deleteModuleTokens(scene, tokens) }));
}

export async function reconcile(scene, plan, { contentId = null, level = null } = {}) {
  const expected = plan.expectedKeys;
  const orphans = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    return flagMatchesContent(flag, { contentId, level }) && !expected.has(populationKey(flag));
  });
  return verifiedMutation(scene, async () => {
    const removed = await deleteModuleTokens(scene, orphans);
    try {
      const created = await createPlacements(scene, plan.placements);
      return { created, removed };
    } catch (error) {
      if (removed.length) {
        const restoration = removed.map((token) => token.toObject());
        await scene.createEmbeddedDocuments("Token", restoration, { keepId: true });
      }
      throw error;
    }
  });
}

export async function rebuild(scene, plan, { contentId = null, level = null, areas = null } = {}) {
  const selected = areas ? new Set(Array.from(areas, (area) => String(area).toLowerCase())) : null;
  const old = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    return flagMatchesContent(flag, { contentId, level }) && (!selected || selected.has(String(flag.area).toLowerCase()));
  });
  return verifiedMutation(scene, async () => {
    const backups = old.map((token) => token.toObject());
    const removed = await deleteModuleTokens(scene, old);
    try {
      const created = await createPlacements(scene, plan.placements);
      return { created, removed };
    } catch (error) {
      if (backups.length) await scene.createEmbeddedDocuments("Token", backups, { keepId: true });
      throw error;
    }
  });
}

export function moduleTokenCounts(scene, selector = {}) {
  const { contentId = null, level = null } = Number.isInteger(Number(selector))
    ? { level: Number(selector) }
    : (selector ?? {});
  const tokens = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    return flag && ((!contentId && level === null) || flagMatchesContent(flag, { contentId, level }));
  });
  const byArea = {};
  for (const token of tokens) {
    const area = String(getPopulationFlag(token).area);
    byArea[area] = (byArea[area] ?? 0) + 1;
  }
  return { total: tokens.length, byArea };
}
