import { MODULE_ID, MODULE_VERSION } from "./constants.js";

export function makeTokenFlag({ contentId = null, level = null, area, encounterId, actorKey, instance }) {
  const flag = {
    version: MODULE_VERSION,
    area,
    encounterId,
    actorKey,
    instance
  };
  if (Number.isInteger(level)) flag.level = level;
  if (contentId) flag.contentId = String(contentId);
  return flag;
}

export function getPopulationFlag(token) {
  return token?.flags?.[MODULE_ID] ?? null;
}

export function populationKey(flag) {
  if (!flag) return null;
  // Keep the original numeric scope for Levels 1–23 so Tokens created by
  // earlier releases retain exactly the same deterministic population key.
  const scope = flag.level !== undefined && flag.level !== null ? String(flag.level) : flag.contentId;
  if (!scope) return null;
  return [scope, flag.area, flag.encounterId, flag.actorKey, flag.instance].join("|");
}

export function flagMatchesContent(flag, { contentId = null, level = null } = {}) {
  if (!flag) return false;
  if (Number.isInteger(level)) return Number(flag.level) === level;
  return Boolean(contentId) && String(flag.contentId ?? "") === String(contentId);
}

export function isModuleToken(token) {
  return Boolean(token?.flags?.[MODULE_ID]);
}
