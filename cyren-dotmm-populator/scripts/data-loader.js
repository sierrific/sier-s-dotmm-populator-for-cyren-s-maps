import { MODULE_ID } from "./constants.js";

const cache = new Map();

export async function loadLevelData(level) {
  const number = String(level).padStart(2, "0");
  if (cache.has(number)) return foundry.utils.deepClone(cache.get(number));

  const response = await fetch(`modules/${MODULE_ID}/data/level-${number}.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load Level ${number} metadata (${response.status}).`);
  const data = await response.json();
  cache.set(number, data);
  return foundry.utils.deepClone(data);
}

export function clearDataCache() {
  cache.clear();
}
