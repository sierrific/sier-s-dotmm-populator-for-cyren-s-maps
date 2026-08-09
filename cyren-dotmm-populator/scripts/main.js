import { MODULE_ID, SETTINGS } from "./constants.js";
import { CyrenPopulatorApp, openPopulator } from "./ui.js";
import { loadLevelData, clearDataCache } from "./data-loader.js";
import { resolveScene } from "./scene-resolver.js";
import { resolveActors } from "./actor-resolver.js";
import { resolveAnchors } from "./anchor-resolver.js";
import { planPopulation } from "./placement-engine.js";
import { populateMissing, reconcile, removeCreated, rebuild } from "./populator.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.preferredPacks, {
    name: "Preferred Actor compendiums",
    hint: "Comma-separated pack IDs checked before dnd5e.monsters. Compendium matches are review-only until imported to the World.",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  game.settings.register(MODULE_ID, SETTINGS.actorOverrides, {
    name: "Actor UUID overrides",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.register(MODULE_ID, SETTINGS.manualAnchors, {
    name: "Manual placement anchors",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.registerMenu(MODULE_ID, "controlPanel", {
    name: "Sier's DotMM Populator for Cyren's Maps",
    label: "Open Level 1 Review",
    hint: "Review Actor mappings and deterministic placement before creating any Tokens.",
    icon: "fas fa-users-viewfinder",
    type: CyrenPopulatorApp,
    restricted: true
  });
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  module.api = {
    open: openPopulator,
    loadLevelData,
    clearDataCache,
    resolveScene,
    resolveActors,
    resolveAnchors,
    planPopulation,
    populateMissing,
    reconcile,
    removeCreated,
    rebuild
  };
  console.info(`${MODULE_ID} | Ready. GM review is required before population.`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  const tokenControls = controls.find((control) => control.name === "token" || control.name === "tokens");
  if (!tokenControls) return;
  tokenControls.tools.push({
    name: `${MODULE_ID}-open`,
    title: "Sier's DotMM Populator for Cyren's Maps",
    icon: "fas fa-users-viewfinder",
    button: true,
    onClick: () => openPopulator()
  });
});
