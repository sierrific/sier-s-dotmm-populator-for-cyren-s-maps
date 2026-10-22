import { MODULE_ID } from "./constants.js";

export function coreGeneration() {
  return Number(globalThis.game?.release?.generation ?? globalThis.game?.version?.split(".")[0]);
}

export function addPopulatorControl(controls, open) {
  if (!game.user?.isGM) return;
  const group = Array.isArray(controls)
    ? controls.find((control) => ["token", "tokens"].includes(control.name))
    : controls.tokens ?? controls.token;
  if (!group?.tools) return;
  const name = `${MODULE_ID}-open`;
  const tool = { name, title: "Sier's DotMM Populator for Cyren's Maps", icon: "fas fa-users-viewfinder", button: true, visible: true };
  if (Array.isArray(group.tools)) {
    if (!group.tools.some((entry) => entry.name === name)) group.tools.push({ ...tool, onClick: open });
  } else {
    group.tools[name] = { ...tool, order: Object.keys(group.tools).length, onChange: open };
  }
}

export function resolveUuid(uuid) {
  return (foundry.utils.fromUuid ?? globalThis.fromUuid)(uuid);
}

export function documentClass(name) {
  return globalThis.CONFIG?.[name]?.documentClass ?? foundry.documents?.[name] ?? globalThis[name];
}

// The supplied maps are separate Scenes, not a combined multi-level Scene.
// Refuse an ambiguous vertical layout rather than putting every floor on one Level.
export function sceneLevelData(scene) {
  if (coreGeneration() < 14 || !Number.isFinite(coreGeneration())) return {};
  const levels = Array.from(scene.levels ?? []);
  if (levels.length !== 1 || !levels[0]?.id) {
    throw new Error("Use a Cyren map with exactly one Scene Level. Combined multi-level Scenes require a separate placement mapping.");
  }
  return { level: levels[0].id };
}
