import { MODULE_ID, SETTINGS, SUPPORTED_LEVELS } from "./constants.js";
import { loadLevelData } from "./data-loader.js";
import { validateEnvironment, validateLevelData, assertGm } from "./validation.js";
import { resolveScene, scoreScene } from "./scene-resolver.js";
import { resolveActors, actorResolutionSummary, actorSpecs } from "./actor-resolver.js";
import { resolveAnchors } from "./anchor-resolver.js";
import { planPopulation } from "./placement-engine.js";
import { populateMissing, removeCreated, reconcile, rebuild, moduleTokenCounts } from "./populator.js";
import { authorAnchor, cancelAnchorAuthoring } from "./anchor-authoring.js";
import { openPlutoniumCreatureImporter, plutoniumStatus } from "./plutonium-helper.js";

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
  ui.notifications.info(`Sier's DotMM Populator: ${created} criado(s), ${removed} removido(s).`);
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

  async _selectedLevelData() {
    const levels = await Promise.all(SUPPORTED_LEVELS.map((level) => loadLevelData(level)));
    if (this.selectedLevel) return levels.find((data) => data.level === this.selectedLevel) ?? levels[0];

    const activeScene = canvas?.scene;
    if (activeScene) {
      const ranked = levels
        .map((data) => ({ data, ...scoreScene(activeScene, data.scene) }))
        .sort((left, right) => right.score - left.score);
      if (ranked[0]?.score >= 180 && ranked[0].score > (ranked[1]?.score ?? 0)) {
        this.selectedLevel = ranked[0].data.level;
        return ranked[0].data;
      }
    }

    const saved = Number(game.settings.get(MODULE_ID, SETTINGS.selectedLevel));
    this.selectedLevel = SUPPORTED_LEVELS.includes(saved) ? saved : SUPPORTED_LEVELS[0];
    return levels.find((data) => data.level === this.selectedLevel) ?? levels[0];
  }

  async _buildContext() {
    assertGm();
    const data = await this._selectedLevelData();
    this.selectedLevel = data.level;
    this.options.title = `Sier's DotMM Populator for Cyren's Maps — Level ${data.level}`;
    const environment = validateEnvironment();
    const dataValidation = validateLevelData(data);
    const sceneResolution = resolveScene(data.scene);
    if (sceneResolution.status !== "resolved") {
      return { data, environment, dataValidation, sceneResolution, blocked: true };
    }
    const scene = sceneResolution.scene;
    const actors = await resolveActors(data);
    const anchors = resolveAnchors(scene, data);
    const plan = planPopulation(scene, data, actors, anchors);
    const actorBlockers = Array.from(actors.values()).filter((result) => result.status !== "resolved");
    const anchorBlockers = Array.from(anchors.values()).filter((result) => result.status !== "resolved");
    const blocked = !environment.ok || !dataValidation.ok || actorBlockers.length > 0 || anchorBlockers.length > 0;
    return { data, environment, dataValidation, sceneResolution, scene, actors, anchors, plan, actorBlockers, anchorBlockers, blocked };
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
    const encounterRows = (context.data.encounters ?? []).map((encounter) => ({
      id: encounter.id,
      area: encounter.area,
      total: encounter.tokens.reduce((sum, token) => sum + token.count, 0),
      humanReview: Boolean(encounter.humanReview),
      conditional: Boolean(encounter.conditional),
      anchorStatus: context.anchors?.get(encounter.area.toLowerCase())?.status ?? "unresolved"
    }));
    return {
      ...context,
      level: context.data.level,
      levelTitle: context.data.title,
      supportedLevels: SUPPORTED_LEVELS.map((level) => ({ level, selected: level === context.data.level })),
      sceneName: context.scene?.name ?? "—",
      sceneStatus: context.sceneResolution.status,
      environmentErrors: context.environment.errors,
      environmentWarnings: context.environment.warnings,
      dataErrors: context.dataValidation.errors,
      dataWarnings: context.dataValidation.warnings,
      actorRows,
      actorSummary: context.actors ? actorResolutionSummary(context.actors) : {},
      anchorRows,
      encounterRows,
      unresolvedActorNames: actorRows.filter((row) => row.status !== "resolved").map((row) => row.actor).join(", "),
      planCount: context.plan?.placements.length ?? 0,
      skippedCount: context.plan?.skipped.length ?? 0,
      moduleCounts: context.scene ? moduleTokenCounts(context.scene, context.data.level) : { total: 0, byArea: {} },
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
    html.find('[name="selectedLevel"]').on("change", (event) => this._onLevelChange(event));
  }

  async _onLevelChange(event) {
    const level = Number(event.currentTarget.value);
    if (!SUPPORTED_LEVELS.includes(level)) return;
    this.selectedLevel = level;
    await game.settings.set(MODULE_ID, SETTINGS.selectedLevel, level);
    await this._refreshContext();
  }

  async _refreshContext() {
    clearPreview();
    this.context = await this._buildContext();
    await this.render(false);
  }

  async _onAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    try {
      if (action === "refresh") return this._refreshContext();
      if (action === "save-settings") return this.submit({ preventClose: true });
      if (action === "open-plutonium") {
        await openPlutoniumCreatureImporter();
        return;
      }
      const context = this.context ?? await this._buildContext();
      if (!context.scene || !context.plan) throw new Error(`No unambiguous Level ${context.data.level} Scene is available.`);
      if (action === "preview") {
        drawPreview(context.scene, context.plan);
        return ui.notifications.info(`Preview: ${context.plan.placements.length} token(s) planejado(s).`);
      }
      if (action === "clear-preview") return clearPreview();
      if (action === "author-anchor") {
        const area = String(this.element.find('[name="selectedArea"]').val() ?? "").trim().toLowerCase();
        if (!area) throw new Error("Choose an area.");
        await authorAnchor(context.scene, area);
        await this._refreshContext();
        return;
      }
      if (context.blocked) throw new Error("Resolve every Actor and area anchor before creating persistent Tokens.");
      if (action === "populate") displayStatus(await populateMissing(context.scene, context.plan));
      if (action === "reconcile") displayStatus(await reconcile(context.scene, context.plan, { level: context.data.level }));
      if (action === "remove") {
        if (!await confirmAction("Remover Tokens", `Remover somente Tokens com flags deste módulo no Level ${context.data.level}?`)) return;
        displayStatus(await removeCreated(context.scene, { level: context.data.level }));
      }
      if (action === "rebuild-level") {
        if (!await confirmAction(`Reconstruir Level ${context.data.level}`, "Remover e recriar somente os Tokens marcados por este módulo?")) return;
        const fresh = planPopulation(context.scene, context.data, context.actors, context.anchors, { ignoreExisting: true });
        displayStatus(await rebuild(context.scene, fresh, { level: context.data.level }));
      }
      if (action === "rebuild-area") {
        const area = String(this.element.find('[name="selectedArea"]').val() ?? "").trim().toLowerCase();
        if (!area) throw new Error("Choose an area.");
        if (!await confirmAction(`Reconstruir área ${area}`, "Somente Tokens deste módulo nessa área serão removidos e recriados.")) return;
        const fresh = planPopulation(context.scene, context.data, context.actors, context.anchors, { areas: [area], ignoreExisting: true });
        displayStatus(await rebuild(context.scene, fresh, { level: context.data.level, areas: [area] }));
      }
      await this._refreshContext();
    } catch (error) {
      if (!String(error.message).includes("cancelled")) ui.notifications.error(`Sier's DotMM Populator: ${error.message}`);
      console.error(`${MODULE_ID} |`, error);
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

export function openPopulator(level = null) {
  assertGm();
  const app = new CyrenPopulatorApp();
  if (SUPPORTED_LEVELS.includes(Number(level))) app.selectedLevel = Number(level);
  return app.render(true);
}

export { clearPreview };
