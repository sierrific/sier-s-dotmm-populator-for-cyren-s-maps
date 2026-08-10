export const MODULE_ID = "cyren-dotmm-populator";
export const MODULE_VERSION = "0.3.0";
export const CYREN_MODULE_ID = "cyrensmaps-wdmm";
export const CYREN_TESTED_VERSION = "1.0.0";
export const SUPPORTED_CORE_GENERATION = 12;
export const SUPPORTED_LEVELS = Object.freeze(Array.from({ length: 23 }, (_value, index) => index + 1));

export const SETTINGS = Object.freeze({
  preferredPacks: "preferredActorPacks",
  actorOverrides: "actorOverrides",
  manualAnchors: "manualAnchors",
  selectedLevel: "selectedLevel"
});

export const TOKEN_FLAG = MODULE_ID;
