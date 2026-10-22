import { MODULE_ID, MODULE_VERSION, SUPPORTED_CONTENT } from "./constants.js";
import { loadContentData } from "./data-loader.js";
import { actorSpecs, normalizeActorName, resolveActorSpec } from "./actor-resolver.js";
import { assertGm } from "./validation.js";
import { documentClass, resolveUuid } from "./compatibility.js";

async function importFolder() {
  return game.folders.find((folder) => folder.type === "Actor" && folder.name === "Sier's DotMM Populator Imports")
    ?? documentClass("Folder").create({ name: "Sier's DotMM Populator Imports", type: "Actor", sorting: "a" });
}

export function isManagedImport(actor, folder = null) {
  const marker = actor?.flags?.[MODULE_ID]?.importedActor;
  if (!marker?.sourceUuid) return false;
  if (!folder) return true;
  return (actor.folder?.id ?? actor.folder) === folder.id;
}

async function removeRedundantImports(folder) {
  const groups = new Map();
  for (const actor of game.actors) {
    const key = normalizeActorName(actor.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(actor);
  }
  const remove = [];
  for (const actors of groups.values()) {
    if (actors.length < 2) continue;
    const imported = actors.filter((actor) => isManagedImport(actor, folder));
    const existing = actors.filter((actor) => !imported.includes(actor));
    if (existing.length) remove.push(...imported);
    else if (imported.length > 1) remove.push(...imported.toSorted((left, right) => left.id.localeCompare(right.id)).slice(1));
  }
  if (remove.length) await documentClass("Actor").deleteDocuments(remove.map((actor) => actor.id));
  return remove;
}

const DEFAULT_IMPORT_ENTRIES = SUPPORTED_CONTENT.filter((entry) => ![1, 2].includes(entry.level));

export async function importAvailableActors({ contentIds = DEFAULT_IMPORT_ENTRIES.map((entry) => entry.id) } = {}) {
  assertGm();
  const folder = await importFolder();
  const removedDuplicates = await removeRedundantImports(folder);
  const created = [];
  const alreadyResolved = [];
  const blocked = [];
  const processed = new Set();

  for (const contentId of contentIds) {
    const data = await loadContentData(contentId);
    for (const spec of actorSpecs(data).values()) {
      const identity = JSON.stringify([spec.actor, spec.resolutionNames, spec.aliases]);
      if (processed.has(identity)) continue;
      processed.add(identity);
      const result = await resolveActorSpec(spec);
      if (result.status === "resolved") {
        alreadyResolved.push(result.document);
        continue;
      }
      if (result.status !== "requiresImport" || !result.uuid) {
        blocked.push({ contentId, level: data.level ?? null, actor: spec.actor, actorKey: spec.actorKey, status: result.status, candidates: result.candidates?.length ?? 0 });
        continue;
      }
      const source = await resolveUuid(result.uuid);
      if (!source || source.documentName !== "Actor") {
        blocked.push({ contentId, level: data.level ?? null, actor: spec.actor, actorKey: spec.actorKey, status: "invalid-compendium-source", candidates: 0 });
        continue;
      }
      const actorData = source.toObject();
      delete actorData._id;
      actorData.folder = folder.id;
      actorData.flags ??= {};
      actorData.flags[MODULE_ID] = {
        ...(actorData.flags[MODULE_ID] ?? {}),
        importedActor: {
          sourceUuid: source.uuid,
          version: MODULE_VERSION
        }
      };
      created.push(await documentClass("Actor").create(actorData, { renderSheet: false }));
    }
  }
  removedDuplicates.push(...await removeRedundantImports(folder));
  return { created, alreadyResolved, blocked, removedDuplicates, processed: processed.size, folder };
}
