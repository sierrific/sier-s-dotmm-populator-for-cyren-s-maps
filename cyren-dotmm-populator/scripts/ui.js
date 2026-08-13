import { MODULE_ID, SETTINGS, SUPPORTED_CONTENT, contentIdForData, contentIdForLevel, contentLabel } from "./constants.js";
import { loadContentData } from "./data-loader.js";
import { validateEnvironment, validateLevelData, assertGm } from "./validation.js";
import { resolveLevelScene, scoreLevelScene, scopeLevelData } from "./scene-resolver.js";
import { resolveActors, actorResolutionSummary, actorSpecs } from "./actor-resolver.js";
import { resolveAnchors } from "./anchor-resolver.js";
import { planPopulation } from "./placement-engine.js";
import { populateMissing, removeCreated, reconcile, rebuild, moduleTokenCounts } from "./populator.js";
import { authorAnchor, cancelAnchorAuthoring } from "./anchor-authoring.js";
import { openPlutoniumCreatureImporter, plutoniumStatus } from "./plutonium-helper.js";
import { createMissingSafetyCopies } from "./safety-copies.js";
import { importAvailableActors } from "./actor-importer.js";
import { panToEncounter } from "./encounter-navigation.js";

let previewContainer = null;

function clearPreview() {
  previewContainer?.destroy?.({ children: true });
  previewContainer = null;
}

function drawPreview(scene, plan) {
  clearPreview();
  if (!canvas?.ready || canvas.scene?.id !== scene.id) throw new Error("Activate the target Scene to preview placement.");
  const layer = new PIXI.Container();
  layer.name = `${MODULE_ID}-preview`;
  layer.eventMode = "none";
  for (const placement of plan.placements) {
    const graphic = new PIXI.Graphics();
    graphic.lineStyle(3, 0x45d483, 0.95);
    graphic.beginFill(0x45d483, 0.18);
    graphic.drawRect(placement.x, placement.y, placement.rect.width, placement.rect.height);
    graphic.endFill();
    layer.addChild(graphic);
  }
  canvas.stage.addChild(layer);
  previewContainer = layer;
}

function displayStatus(result) {
  const created = result?.created?.length ?? 0;
  const removed = result?.removed?.length ?? 0;
  ui.notifications.info(`Sier's DotMM Populator: ${created} created, ${removed} removed.`);
}

async function confirmAction(title, content) {
  return Dialog.confirm({ title, content, yes: () => true, no: () => false, defaultYes: false });
}

export class CyrenPopulatorApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-app`,
      title: "Sier's DotMM Populator for Cyren's Maps",
      template: `modules/${MODULE_ID}/templates/populator.hbs`,
      width: 860,
      height: 720,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "review" }]
    });
  }

  async _selectedContentData() {
    const entries = await Promise.all(SUPPORTED_CONTENT.map((entry) => loadContentData(entry.id)));
    if (this.selectedContent) return entries.find((data) => contentIdForData(data) === this.selectedContent) ?? entries[0];

    const activeScene = canvas?.scene;
    if (activeScene) {
      const ranked = entries
        .map((data) => ({ data, ...scoreLevelScene(activeScene, data) }))
        .sort((left, right) => right.score - left.score);
      if (ranked[0]?.score >= 180 && ranked[0].score > (ranked[1]?.score ?? 0)) {
        this.selectedContent = contentIdForData(ranked[0].data);
        return ranked[0].data;
      }
    }

    const saved = String(game.settings.get(MODULE_ID, SETTINGS.selectedContent) ?? "");
    const legacyLevel = Number(game.settings.get(MODULE_ID, SETTINGS.selectedLevel));
    this.selectedContent = SUPPORTED_CONTENT.some((entry) => entry.id === saved)
      ? saved
      : SUPPORTED_CONTENT.some((entry) => entry.level === legacyLevel) ? contentIdForLevel(legacyLevel) : SUPPORTED_CONTENT[0].id;
    return entries.find((data) => contentIdForData(data) === this.selectedContent) ?? entries[0];
  }

  async _buildContext() {
    assertGm();
    const levelData = await this._selectedContentData();
    this.selectedContent = contentIdForData(levelData);
    this.options.title = `Sier's DotMM Populator for Cyren's Maps — ${contentLabel(levelData)}`;
    const environment = validateEnvironment();
    const dataValidation = validateLevelData(levelData);
    const sceneResolution = resolveLevelScene(levelData);
    if (sceneResolution.status !== "resolved") {
      return { data: levelData, levelData, environment, dataValidation, sceneResolution, blocked: true };
    }
    const data = scopeLevelData(levelData, sceneResolution.definition.key);
    const scene = sceneResolution.scene;
    const actors = await resolveActors(data);
    const anchors = resolveAnchors(scene, data);
    const plan = planPopulation(scene, data, actors, anchors);
    const actorBlockers = Array.from(actors.values()).filter((result) => result.status !== "resolved");
    const anchorBlockers = Array.from(anchors.values()).filter((result) => result.status !== "resolved");
    const blocked = !environment.ok || !dataValidation.ok || actorBlockers.length > 0 || anchorBlockers.length > 0;
    return { data, levelData, environment, dataValidation, sceneResolution, scene, actors, anchors, plan, actorBlockers, anchorBlockers, blocked };
  }

  async getData() {
    this.context = await this._buildContext();
    const context = this.context;
    const overrides = game.settings.get(MODULE_ID, SETTINGS.actorOverrides) ?? {};
    const actorRows = [];
    if (context.actors) {
      for (const spec of actorSpecs(context.data).values()) {
        const result = context.actors.get(spec.actorKey);
        actorRows.push({
          ...spec,
          status: result.status,
          match: result.name ?? result.matchedName ?? "—",
          source: result.pack ?? result.source ?? "—",
          sourceCode: result.sourceCode ?? "—",
          uuid: overrides[spec.actorKey] ?? "",
          candidateCount: result.candidates?.length ?? 0
        });
      }
    }
    const anchorRows = context.anchors ? Array.from(context.anchors.values()).sort((a, b) => a.area.localeCompare(b.area, undefined, { numeric: true })) : [];
    const availableAreas = new Set(anchorRows.map((row) => row.area));
    if (!availableAreas.has(this.selectedAnchorArea)) this.selectedAnchorArea = anchorRows[0]?.area ?? null;
    if (!availableAreas.has(this.selectedRebuildArea)) this.selectedRebuildArea = anchorRows[0]?.area ?? null;
    const encounterRows = (context.data.encounters ?? []).map((encounter) => ({
      id: encounter.id,
      area: encounter.area,
      total: encounter.tokens.reduce((sum, token) => sum + token.count, 0),
      humanReview: Boolean(encounter.humanReview),
      conditional: Boolean(encounter.conditional),
      anchorStatus: context.anchors?.get(encounter.area.toLowerCase())?.status ?? "unresolved"
    }));
    const currentEncounterIds = new Set(encounterRows.map((row) => row.id));
    const allEncounterIds = new Set((context.levelData?.encounters ?? []).map((encounter) => encounter.id));
    const dataWarningRows = (context.dataValidation.warnings ?? []).flatMap((message) => {
      const encounterId = String(message).split(" ", 1)[0];
      if (allEncounterIds.has(encounterId) && !currentEncounterIds.has(encounterId)) return [];
      return [{
        message,
        encounterId: currentEncounterIds.has(encounterId) ? encounterId : null,
        suffix: currentEncounterIds.has(encounterId) ? String(message).slice(encounterId.length) : null
      }];
    });
    return {
      ...context,
      contentId: contentIdForData(context.data),
      contentLabel: contentLabel(context.data),
      contentTitle: context.data.title,
      level: context.data.level,
      scenePart: context.sceneResolution.definition?.label ?? context.sceneResolution.definition?.key ?? "main",
      splitContent: Array.isArray(context.levelData?.scenes) && context.levelData.scenes.length > 1,
      supportedContent: SUPPORTED_CONTENT.map((entry) => ({ ...entry, selected: entry.id === contentIdForData(context.data) })),
      sceneName: context.scene?.name ?? "—",
      sceneStatus: context.sceneResolution.status,
      environmentErrors: context.environment.errors,
      environmentWarnings: context.environment.warnings,
      dataErrors: context.dataValidation.errors,
      dataWarnings: context.dataValidation.warnings,
      dataWarningRows,
      actorRows,
      actorSummary: context.actors ? actorResolutionSummary(context.actors) : {},
      anchorRows: anchorRows.map((row) => ({
        ...row,
        anchorSelected: row.area === this.selectedAnchorArea,
        rebuildSelected: row.area === this.selectedRebuildArea
      })),
      encounterRows,
      unresolvedActorNames: actorRows.filter((row) => row.status !== "resolved").map((row) => row.actor).join(", "),
      planCount: context.plan?.placements.length ?? 0,
      skippedCount: context.plan?.skipped.length ?? 0,
      moduleCounts: context.scene ? moduleTokenCounts(context.scene, { contentId: contentIdForData(context.data), level: context.data.level ?? null }) : { total: 0, byArea: {} },
      actorTotal: actorRows.length,
      actorResolved: actorRows.filter((row) => row.status === "resolved").length,
      anchorTotal: anchorRows.length,
      anchorResolved: anchorRows.filter((row) => row.status === "resolved").length,
      planIssues: context.plan?.skipped ?? [],
      planWarnings: context.plan?.warnings ?? [],
      preferredPacks: game.settings.get(MODULE_ID, SETTINGS.preferredPacks) ?? "",
      plutonium: plutoniumStatus()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action]").on("click", (event) => this._onAction(event));
    html.find('[name="selectedContent"]').on("change", (event) => this._onContentChange(event));
    html.find('[name="anchorArea"]').on("change", (event) => { this.selectedAnchorArea = String(event.currentTarget.value); });
    html.find('[name="rebuildArea"]').on("change", (event) => { this.selectedRebuildArea = String(event.currentTarget.value); });
  }

  async _onContentChange(event) {
    const contentId = String(event.currentTarget.value);
    if (!SUPPORTED_CONTENT.some((entry) => entry.id === contentId)) return;
    this.selectedContent = contentId;
    this.selectedAnchorArea = null;
    this.selectedRebuildArea = null;
    await game.settings.set(MODULE_ID, SETTINGS.selectedContent, contentId);
    await this._refreshContext();
  }

  async _refreshContext() {
    clearPreview();
    this.context = await this._buildContext();
    await this.render(false);
  }

  async _onAction(event) {
    event.preventDefault();
    if (this._actionInFlight) return;
    this._actionInFlight = true;
    event.currentTarget.disabled = true;
    const action = event.currentTarget.dataset.action;
    try {
      if (action === "refresh") return this._refreshContext();
      if (action === "save-settings") return this.submit({ preventClose: true });
      if (action === "open-plutonium") {
        await openPlutoniumCreatureImporter();
        return;
      }
      if (action === "create-safety-copies") {
        if (!await confirmAction("Create safety copies", "Create only missing copies of the original maps for Yawning Portal, Skullport, and Levels 3–23?")) return;
        const result = await createMissingSafetyCopies();
        if (result.missingSources.length) throw new Error(`Missing source maps: ${result.missingSources.map((item) => item.name).join(", ")}.`);
        ui.notifications.info(`Safety copies: ${result.created.length} created, ${result.existing.length} already existed.`);
        await this._refreshContext();
        return;
      }
      if (action === "import-available-actors") {
        if (!await confirmAction("Import Actors", "Import only unambiguous Actor matches into the World, respecting the XMM → MPMM → MM preference?")) return;
        const result = await importAvailableActors();
        const blocked = result.blocked.length ? ` ${result.blocked.length} name(s) still require review.` : "";
        ui.notifications.info(`Actors: ${result.created.length} imported, ${result.alreadyResolved.length} already available, ${result.removedDuplicates.length} redundant import(s) removed.${blocked}`);
        await this._refreshContext();
        return;
      }
      const context = this.context ?? await this._buildContext();
      const contentId = contentIdForData(context.data);
      const scope = { contentId, level: context.data.level ?? null };
      if (!context.scene) throw new Error(`No unambiguous ${contentLabel(context.data)} map is available.`);
      if (action === "pan-encounter") {
        const encounterId = String(event.currentTarget.dataset.encounterId ?? "");
        const encounter = context.data.encounters.find((candidate) => candidate.id === encounterId);
        if (!encounter) throw new Error(`Unknown encounter: ${encounterId || "none"}.`);
        await panToEncounter({
          scene: context.scene,
          ...scope,
          encounter,
          plan: context.plan,
          anchor: context.anchors?.get(encounter.area.toLowerCase())
        });
        return;
      }
      if (!context.plan) throw new Error(`No placement plan is available for ${contentLabel(context.data)}.`);
      if (action === "preview") {
        drawPreview(context.scene, context.plan);
        return ui.notifications.info(`Preview: ${context.plan.placements.length} token(s) planned.`);
      }
      if (action === "clear-preview") return clearPreview();
      if (action === "author-anchor") {
        const area = String(this.element.find('[name="anchorArea"]').val() ?? "").trim().toLowerCase();
        if (!area) throw new Error("Choose an area.");
        await authorAnchor(context.scene, area);
        await this._refreshContext();
        return;
      }
      if (context.blocked) throw new Error("Resolve every Actor and area anchor before creating persistent Tokens.");
      if (action === "populate") displayStatus(await populateMissing(context.scene, context.plan));
      if (action === "reconcile") displayStatus(await reconcile(context.scene, context.plan, scope));
      if (action === "remove") {
        if (!await confirmAction("Remove Tokens", `Remove only Tokens flagged by this module on ${contentLabel(context.data)}?`)) return;
        displayStatus(await removeCreated(context.scene, scope));
      }
      if (action === "rebuild-level") {
        if (!await confirmAction(`Rebuild ${contentLabel(context.data)}`, "Remove and recreate only Tokens flagged by this module?")) return;
        const fresh = planPopulation(context.scene, context.data, context.actors, context.anchors, { ignoreExisting: true });
        displayStatus(await rebuild(context.scene, fresh, scope));
      }
      if (action === "rebuild-area") {
        const area = String(this.element.find('[name="rebuildArea"]').val() ?? "").trim().toLowerCase();
        if (!area) throw new Error("Choose an area.");
        if (!await confirmAction(`Rebuild area ${area}`, "Only Tokens owned by this module in this area will be removed and recreated.")) return;
        const fresh = planPopulation(context.scene, context.data, context.actors, context.anchors, { areas: [area], ignoreExisting: true });
        displayStatus(await rebuild(context.scene, fresh, { ...scope, areas: [area] }));
      }
      await this._refreshContext();
    } catch (error) {
      if (!String(error.message).includes("cancelled")) ui.notifications.error(`Sier's DotMM Populator: ${error.message}`);
      console.error(`${MODULE_ID} |`, error);
    } finally {
      this._actionInFlight = false;
      if (event.currentTarget?.isConnected) event.currentTarget.disabled = false;
    }
  }

  async _updateObject(_event, formData) {
    assertGm();
    await game.settings.set(MODULE_ID, SETTINGS.preferredPacks, String(formData.preferredPacks ?? "").trim());
    const overrides = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!key.startsWith("override.")) continue;
      const uuid = String(value ?? "").trim();
      if (uuid) overrides[key.slice("override.".length)] = uuid;
    }
    await game.settings.set(MODULE_ID, SETTINGS.actorOverrides, overrides);
    ui.notifications.info("Sier's DotMM Populator settings saved.");
    await this._refreshContext();
  }

  async close(options = {}) {
    clearPreview();
    cancelAnchorAuthoring();
    return super.close(options);
  }
}

export function openPopulator(content = null) {
  assertGm();
  const app = new CyrenPopulatorApp();
  const numericContent = content !== null && content !== "" && Number.isInteger(Number(content));
  const requested = numericContent ? contentIdForLevel(Number(content)) : String(content ?? "");
  if (SUPPORTED_CONTENT.some((entry) => entry.id === requested)) app.selectedContent = requested;
  return app.render(true);
}

export { clearPreview };
