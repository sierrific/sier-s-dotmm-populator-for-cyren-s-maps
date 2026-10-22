export const MODULE_ID = "cyren-dotmm-populator";
export const MODULE_VERSION = "0.5.1";
export const CYREN_MODULE_ID = "cyrensmaps-wdmm";
export const CYREN_TESTED_VERSION = "1.0.0";
export const SUPPORTED_CORE_GENERATIONS = Object.freeze([12, 13, 14]);
export const SUPPORTED_LEVELS = Object.freeze(Array.from({ length: 23 }, (_value, index) => index + 1));

const levelEntry = (level) => ({
  id: `level-${String(level).padStart(2, "0")}`,
  label: `Level ${level}`,
  file: `level-${String(level).padStart(2, "0")}.json`,
  level
});

export const SUPPORTED_CONTENT = Object.freeze([
  { id: "yawning-portal", label: "The Yawning Portal", file: "yawning-portal.json" },
  ...SUPPORTED_LEVELS.slice(0, 3).map(levelEntry),
  { id: "skullport-lower-middle", label: "Skullport — Lower & Middle", file: "skullport-lower-middle.json" },
  { id: "skullport-skull-island", label: "Skullport — Skull Island", file: "skullport-skull-island.json" },
  { id: "skullport-upper", label: "Skullport — Upper", file: "skullport-upper.json" },
  ...SUPPORTED_LEVELS.slice(3).map(levelEntry)
]);

export function contentIdForLevel(level) {
  return `level-${String(level).padStart(2, "0")}`;
}

export function contentIdForData(data) {
  return String(data?.contentId ?? (Number.isInteger(data?.level) ? contentIdForLevel(data.level) : ""));
}

export function contentLabel(data) {
  return String(data?.label ?? (Number.isInteger(data?.level) ? `Level ${data.level}` : data?.title ?? data?.contentId ?? "Unknown location"));
}

export const SETTINGS = Object.freeze({
  preferredPacks: "preferredActorPacks",
  actorOverrides: "actorOverrides",
  manualAnchors: "manualAnchors",
  selectedLevel: "selectedLevel",
  selectedContent: "selectedContent"
});

export const TOKEN_FLAG = MODULE_ID;
