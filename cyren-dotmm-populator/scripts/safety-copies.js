import { SUPPORTED_CONTENT } from "./constants.js";
import { loadContentData } from "./data-loader.js";
import { isExactSceneGeometry, levelSceneDefinitions } from "./scene-resolver.js";
import { assertGm } from "./validation.js";
import { documentClass } from "./compatibility.js";

function sourceId(scene) {
  return scene.flags?.["scene-packer"]?.sourceId ?? null;
}

function copyName(definition) {
  const original = definition.names?.find((name) => !/\(copy(?:\s+\d+)?\)$/i.test(name)) ?? definition.names?.[0];
  return `${original} (Copy)`;
}

function findOriginal(definition) {
  const originalNames = new Set((definition.names ?? []).filter((name) => !/\(copy(?:\s+\d+)?\)$/i.test(name)));
  const candidates = game.scenes.contents.filter((scene) => originalNames.has(scene.name) && isExactSceneGeometry(scene, definition));
  return candidates.find((scene) => sourceId(scene) === definition.sourceId) ?? candidates[0] ?? null;
}

function findCopy(definition) {
  const wanted = copyName(definition);
  return game.scenes.contents.find((scene) => scene.name === wanted && isExactSceneGeometry(scene, definition)) ?? null;
}

const DEFAULT_COPY_ENTRIES = SUPPORTED_CONTENT.filter((entry) => ![1, 2].includes(entry.level));

export async function safetyCopyStatus({ contentIds = DEFAULT_COPY_ENTRIES.map((entry) => entry.id) } = {}) {
  const rows = [];
  for (const contentId of contentIds) {
    const data = await loadContentData(contentId);
    for (const definition of levelSceneDefinitions(data)) {
      rows.push({ contentId, level: data.level ?? null, sceneKey: definition.key, source: findOriginal(definition), copy: findCopy(definition), copyName: copyName(definition), definition });
    }
  }
  return rows;
}

export async function createMissingSafetyCopies(options = {}) {
  assertGm();
  const rows = await safetyCopyStatus(options);
  const created = [];
  const existing = [];
  const missingSources = [];
  for (const row of rows) {
    if (row.copy) {
      existing.push(row.copy);
      continue;
    }
    if (!row.source) {
      missingSources.push({ contentId: row.contentId, level: row.level, sceneKey: row.sceneKey, name: row.definition.names?.[0] ?? row.copyName });
      continue;
    }
    const data = row.source.toObject();
    delete data._id;
    data.name = row.copyName;
    data.navigation = false;
    data.active = false;
    created.push(await documentClass("Scene").create(data, { renderSheet: false }));
  }
  return { created, existing, missingSources, expected: rows.length };
}
