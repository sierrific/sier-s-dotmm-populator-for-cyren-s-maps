export function plutoniumStatus() {
  const module = game.modules.get("plutonium");
  const importerApi = module?.api?.importer;
  return {
    installed: Boolean(module),
    active: Boolean(module?.active),
    version: module?.version ?? null,
    hasCreatureImporter: Boolean(importerApi?.pOpen || importerApi?.pGetImporter)
  };
}

export async function openPlutoniumCreatureImporter() {
  const status = plutoniumStatus();
  if (!status.active) throw new Error("Plutonium is not active in this World.");
  if (!status.hasCreatureImporter) throw new Error("This Plutonium version does not expose the creature importer API.");

  const importerApi = game.modules.get("plutonium").api.importer;
  if (importerApi.pOpen) return importerApi.pOpen();

  const importer = await importerApi.pGetImporter({ page: "bestiary.html" });
  if (!importer?.render) throw new Error("Plutonium did not return a renderable creature importer.");
  importer.render(true);
  return importer;
}
