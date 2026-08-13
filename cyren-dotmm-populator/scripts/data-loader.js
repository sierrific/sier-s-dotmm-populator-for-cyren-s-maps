import { MODULE_ID, SUPPORTED_CONTENT, contentIdForLevel } from "./constants.js";

const cache = new Map();

export async function loadContentData(contentId) {
  const entry = SUPPORTED_CONTENT.find((candidate) => candidate.id === String(contentId));
  if (!entry) throw new Error(`Unknown content entry: ${contentId}.`);
  if (cache.has(entry.id)) return foundry.utils.deepClone(cache.get(entry.id));

  // Include the installed module version so a live module update cannot reuse
  // an older JSON response from Foundry's service-worker cache.
  const version = encodeURIComponent(String(game.modules.get(MODULE_ID)?.version ?? "dev"));
  const response = await fetch(`modules/${MODULE_ID}/data/${entry.file}?v=${version}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${entry.label} metadata (${response.status}).`);
  const data = await response.json();
  data.contentId ??= entry.id;
  data.label ??= entry.label;
  cache.set(entry.id, data);
  return foundry.utils.deepClone(data);
}

export function loadLevelData(level) {
  return loadContentData(contentIdForLevel(level));
}

export function clearDataCache() {
  cache.clear();
}
