import { MODULE_ID, MODULE_VERSION } from "./constants.js";

export function makeTokenFlag({ level, area, encounterId, actorKey, instance }) {
  return {
    version: MODULE_VERSION,
    level,
    area,
    encounterId,
    actorKey,
    instance
  };
}

export function getPopulationFlag(token) {
  return token?.flags?.[MODULE_ID] ?? null;
}

export function populationKey(flag) {
  if (!flag) return null;
  return [flag.level, flag.area, flag.encounterId, flag.actorKey, flag.instance].join("|");
}

export function isModuleToken(token) {
  return Boolean(token?.flags?.[MODULE_ID]);
}
