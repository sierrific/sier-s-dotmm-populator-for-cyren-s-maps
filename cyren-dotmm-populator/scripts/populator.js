import { MODULE_ID } from "./constants.js";
import { getPopulationFlag, isModuleToken, populationKey } from "./flags.js";
import { fingerprintScene, verifyTokenOnlyMutation, assertGm } from "./validation.js";

async function tokenDataForPlacement(placement) {
  const token = await placement.actor.getTokenDocument({
    x: placement.x,
    y: placement.y,
    hidden: Boolean(placement.spec.hidden),
    disposition: Number(placement.spec.disposition ?? -1)
  });
  const data = token.toObject();
  delete data._id;
  data.x = placement.x;
  data.y = placement.y;
  data.hidden = Boolean(placement.spec.hidden);
  data.disposition = Number(placement.spec.disposition ?? -1);
  if (placement.spec.tokenWidth) data.width = Number(placement.spec.tokenWidth);
  if (placement.spec.tokenHeight) data.height = Number(placement.spec.tokenHeight);
  if (placement.spec.tokenName) data.name = placement.spec.tokenName;
  data.flags ??= {};
  data.flags[MODULE_ID] = placement.flag;
  return data;
}

async function createPlacements(scene, placements) {
  if (!placements.length) return [];
  const data = [];
  for (const placement of placements) data.push(await tokenDataForPlacement(placement));
  return scene.createEmbeddedDocuments("Token", data);
}

async function deleteModuleTokens(scene, tokens) {
  const safe = Array.from(tokens).filter((token) => token.parent?.id === scene.id && isModuleToken(token));
  if (!safe.length) return [];
  await scene.deleteEmbeddedDocuments("Token", safe.map((token) => token.id));
  return safe;
}

async function verifiedMutation(scene, operation) {
  assertGm();
  const before = fingerprintScene(scene);
  const result = await operation();
  const after = fingerprintScene(scene);
  const verification = verifyTokenOnlyMutation(before, after, {
    created: result.created?.map((token) => token.id) ?? [],
    removed: result.removed?.map((token) => token.id) ?? []
  });
  if (!verification.ok) {
    const rollbackErrors = [];
    try {
      const created = (result.created ?? []).filter((token) => isModuleToken(token));
      if (created.length) await scene.deleteEmbeddedDocuments("Token", created.map((token) => token.id));
    } catch (error) {
      rollbackErrors.push(`created-token rollback failed: ${error.message}`);
    }
    try {
      const removed = result.removed ?? [];
      if (removed.length) await scene.createEmbeddedDocuments("Token", removed.map((token) => token.toObject()), { keepId: true });
    } catch (error) {
      rollbackErrors.push(`removed-token restore failed: ${error.message}`);
    }
    throw new Error(`Safety verification failed: ${verification.errors.join(" ")}${rollbackErrors.length ? ` Rollback: ${rollbackErrors.join(" ")}` : " Changes were rolled back."}`);
  }
  return { ...result, verification };
}

export async function populateMissing(scene, plan) {
  return verifiedMutation(scene, async () => ({ created: await createPlacements(scene, plan.placements), removed: [] }));
}

export async function removeCreated(scene, { level = null, areas = null } = {}) {
  const selected = areas ? new Set(Array.from(areas, (area) => String(area).toLowerCase())) : null;
  const tokens = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    if (!flag) return false;
    if (level !== null && Number(flag.level) !== Number(level)) return false;
    return !selected || selected.has(String(flag.area).toLowerCase());
  });
  return verifiedMutation(scene, async () => ({ created: [], removed: await deleteModuleTokens(scene, tokens) }));
}

export async function reconcile(scene, plan, { level }) {
  const expected = plan.expectedKeys;
  const orphans = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    return flag && Number(flag.level) === Number(level) && !expected.has(populationKey(flag));
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

export async function rebuild(scene, plan, { level, areas = null }) {
  const selected = areas ? new Set(Array.from(areas, (area) => String(area).toLowerCase())) : null;
  const old = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    return flag && Number(flag.level) === Number(level) && (!selected || selected.has(String(flag.area).toLowerCase()));
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

export function moduleTokenCounts(scene, level = null) {
  const tokens = Array.from(scene.tokens ?? []).filter((token) => {
    const flag = getPopulationFlag(token);
    return flag && (level === null || Number(flag.level) === Number(level));
  });
  const byArea = {};
  for (const token of tokens) {
    const area = String(getPopulationFlag(token).area);
    byArea[area] = (byArea[area] ?? 0) + 1;
  }
  return { total: tokens.length, byArea };
}
