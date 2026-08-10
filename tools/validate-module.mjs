import fs from "node:fs";
import path from "node:path";
import { expectedCanvasBounds, levelSceneDefinitions } from "../cyren-dotmm-populator/scripts/scene-resolver.js";

const root = path.resolve("cyren-dotmm-populator");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "module.json"), "utf8"));
const packageMetadata = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
const constants = fs.readFileSync(path.join(root, "scripts", "constants.js"), "utf8");
const uiSource = fs.readFileSync(path.join(root, "scripts", "ui.js"), "utf8");
const templateSource = fs.readFileSync(path.join(root, "templates", "populator.hbs"), "utf8");
const expectedLevels = new Map([
  [1, { encounters: 33, tokens: 133, anchors: 33 }],
  [2, { encounters: 48, tokens: 183, anchors: 47 }],
  [3, { encounters: 61, tokens: 255, anchors: 61 }],
  [4, { encounters: 27, tokens: 114, anchors: 27 }],
  [5, { encounters: 36, tokens: 90, anchors: 36 }],
  [6, { encounters: 26, tokens: 59, anchors: 26 }],
  [7, { encounters: 23, tokens: 61, anchors: 23 }],
  [8, { encounters: 21, tokens: 99, anchors: 21 }],
  [9, { encounters: 32, tokens: 63, anchors: 32 }],
  [10, { encounters: 31, tokens: 196, anchors: 31 }],
  [11, { encounters: 24, tokens: 210, anchors: 24 }],
  [12, { encounters: 33, tokens: 175, anchors: 33 }],
  [13, { encounters: 13, tokens: 86, anchors: 13 }],
  [14, { encounters: 33, tokens: 155, anchors: 33 }],
  [15, { encounters: 19, tokens: 96, anchors: 19 }],
  [16, { encounters: 34, tokens: 84, anchors: 34 }],
  [17, { encounters: 17, tokens: 75, anchors: 17 }],
  [18, { encounters: 21, tokens: 115, anchors: 21 }],
  [19, { encounters: 15, tokens: 74, anchors: 15 }],
  [20, { encounters: 20, tokens: 97, anchors: 20 }],
  [21, { encounters: 30, tokens: 120, anchors: 30 }],
  [22, { encounters: 23, tokens: 72, anchors: 23 }],
  [23, { encounters: 17, tokens: 68, anchors: 17 }]
]);
const levels = [...expectedLevels.keys()].map((level) => JSON.parse(
  fs.readFileSync(path.join(root, "data", `level-${String(level).padStart(2, "0")}.json`), "utf8")
));
const errors = [];

if (manifest.id !== "cyren-dotmm-populator") errors.push("Unexpected module id.");
if (manifest.title !== "Sier's DotMM Populator for Cyren's Maps") errors.push("Unexpected public module title.");
if (manifest.version !== packageMetadata.version) errors.push("package.json and module.json versions differ.");
if (constants.match(/MODULE_VERSION\s*=\s*"([^"]+)"/)?.[1] !== manifest.version) errors.push("MODULE_VERSION and module.json versions differ.");
if (manifest.compatibility?.verified !== "12.331") errors.push("Foundry verified version must be 12.331.");
const repository = "https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps";
if (manifest.url !== repository) errors.push("Unexpected project URL.");
if (manifest.manifest !== `${repository.replace("github.com", "raw.githubusercontent.com")}/main/cyren-dotmm-populator/module.json`) errors.push("Unexpected manifest URL.");
if (manifest.download !== `${repository}/releases/download/v${manifest.version}/cyren-dotmm-populator-${manifest.version}.zip`) errors.push("Download URL must match the module version.");
if (!manifest.relationships?.requires?.some((item) => item.id === "cyrensmaps-wdmm")) errors.push("Cyren dependency is missing.");
if (!templateSource.includes('name="anchorArea"') || !uiSource.includes('[name="anchorArea"]')) errors.push("Anchor authoring selector is not wired independently.");
if (!templateSource.includes('name="rebuildArea"') || !uiSource.includes('[name="rebuildArea"]')) errors.push("Area rebuild selector is not wired independently.");
if (templateSource.includes('name="selectedArea"') || uiSource.includes('[name="selectedArea"]')) errors.push("Legacy shared area selector must not be used.");

const forbiddenKeys = new Set(["description", "entries", "statBlock", "statblock", "content", "html", "prose"]);
function inspectDerivedData(value, pointer) {
  if (Array.isArray(value)) return value.forEach((item, index) => inspectDerivedData(item, `${pointer}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) errors.push(`Forbidden prose/stat-block field: ${pointer}.${key}`);
    inspectDerivedData(child, `${pointer}.${key}`);
  }
}

const summaries = [];
for (const level of levels) {
  const expected = expectedLevels.get(level.level);
  const scenes = levelSceneDefinitions(level);
  const scenesByKey = new Map(scenes.map((scene) => [scene.key, scene]));
  const defaultSceneKey = scenes[0]?.key ?? "main";
  if (!expected) {
    errors.push(`Unexpected level dataset: ${level.level}`);
    continue;
  }
  if (level.encounters.length !== expected.encounters) errors.push(`Level ${level.level}: expected ${expected.encounters} encounter groups, got ${level.encounters.length}.`);
  const count = level.encounters.flatMap((encounter) => encounter.tokens).reduce((sum, token) => sum + token.count, 0);
  if (count !== expected.tokens) errors.push(`Level ${level.level}: expected ${expected.tokens} static token instances, got ${count}.`);
  if (Object.keys(level.anchors ?? {}).length !== expected.anchors) errors.push(`Level ${level.level}: expected ${expected.anchors} fallback anchors.`);
  if (JSON.stringify(level.actorSourcePreference) !== JSON.stringify(["XMM", "MPMM", "MM"])) errors.push(`Level ${level.level}: unexpected modern-source preference.`);
  if (level.level === 3 && scenes.length !== 3) errors.push("Level 3 must contain all three map segments.");
  if (level.level !== 3 && scenes.length !== 1) errors.push(`Level ${level.level} must contain exactly one map segment.`);

  const keys = new Set();
  const encounterIds = new Set();
  const actorKeys = new Set();
  for (const encounter of level.encounters) {
    if (encounterIds.has(encounter.id)) errors.push(`Duplicate encounter id: ${encounter.id}`);
    encounterIds.add(encounter.id);
    if (!/^\d+(?:[a-z]|-[a-z0-9]+)?$/i.test(encounter.area)) errors.push(`Malformed area id: ${encounter.area}`);
    const anchor = level.anchors[encounter.area];
    if (!anchor) errors.push(`Unresolved static anchor: Level ${level.level}/${encounter.area}`);
    const sceneKey = String(encounter.sceneKey ?? defaultSceneKey);
    const scene = scenesByKey.get(sceneKey);
    if (!scene) errors.push(`Unknown Scene key in ${encounter.id}: ${sceneKey}`);
    if (anchor && String(anchor.sceneKey ?? defaultSceneKey) !== sceneKey) errors.push(`Anchor/encounter Scene mismatch in ${encounter.id}.`);
    const bounds = scene ? expectedCanvasBounds(scene) : null;

    const encounterActorKeys = new Set();
    for (const token of encounter.tokens) {
      actorKeys.add(token.actorKey);
      if (encounterActorKeys.has(token.actorKey)) errors.push(`Duplicate actor key inside ${encounter.id}: ${token.actorKey}`);
      encounterActorKeys.add(token.actorKey);
      if (!String(token.actorKey ?? "").trim()) errors.push(`Missing actor key in ${encounter.id}.`);
      if (!String(token.actor ?? "").trim()) errors.push(`Missing actor name in ${encounter.id}.`);
      if (!Number.isInteger(token.count) || token.count < 1) errors.push(`Invalid token count in ${encounter.id}.`);
      if (token.tokenWidth !== undefined && (!Number.isFinite(token.tokenWidth) || token.tokenWidth <= 0)) errors.push(`Invalid token width in ${encounter.id}.`);
      if (token.tokenHeight !== undefined && (!Number.isFinite(token.tokenHeight) || token.tokenHeight <= 0)) errors.push(`Invalid token height in ${encounter.id}.`);
      if (token.positions !== undefined && token.positions.length !== token.count) errors.push(`Exact-position count mismatch in ${encounter.id}/${token.actorKey}.`);
      for (const position of token.positions ?? []) {
        const width = Number(position.width ?? token.tokenWidth ?? 1) * Number(scene?.grid ?? 0);
        const height = Number(position.height ?? token.tokenHeight ?? 1) * Number(scene?.grid ?? 0);
        if (!bounds || !Number.isFinite(position.x) || !Number.isFinite(position.y)
          || position.x < 0 || position.y < 0 || position.x + width > bounds.width || position.y + height > bounds.height) {
          errors.push(`Out-of-bounds exact position in ${encounter.id}/${token.actorKey}.`);
        }
      }
      for (let instance = 1; instance <= token.count; instance += 1) {
        const key = `${level.level}|${encounter.area}|${encounter.id}|${token.actorKey}|${instance}`;
        if (keys.has(key)) errors.push(`Duplicate population key: ${key}`);
        keys.add(key);
      }
    }
  }

  for (const [area, anchor] of Object.entries(level.anchors)) {
    const scene = scenesByKey.get(String(anchor.sceneKey ?? defaultSceneKey));
    const bounds = scene ? expectedCanvasBounds(scene) : null;
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) errors.push(`Non-numeric anchor: Level ${level.level}/${area}`);
    if (!bounds || anchor.x < 0 || anchor.y < 0 || anchor.x > bounds.width || anchor.y > bounds.height) errors.push(`Out-of-bounds anchor: Level ${level.level}/${area}`);
  }

  if (level.level === 1 && (level.anchors["39"]?.x !== 6020 || level.anchors["39"]?.y !== 12180)) errors.push("Level 1 area 39 must resolve to the center of Cyren tile 39a.");
  if (level.level === 2 && (level.anchors["11b"]?.x !== 9870 || level.anchors["11b"]?.y !== 4690)) errors.push("Level 2 area 11b must use the verified fallback.");
  inspectDerivedData(level, `level-${String(level.level).padStart(2, "0")}`);
  summaries.push({ level: level.level, maps: scenes.length, encounters: level.encounters.length, staticTokens: count, actorTypes: actorKeys.size, anchors: Object.keys(level.anchors).length, uniqueKeys: keys.size });
}

const forbiddenNames = [/adventure-wdmm/i, /5etools/i, /ddb-third-party/i, /\.ldb$/i, /\.(?:webp|png|jpe?g|pdf)$/i];
for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (forbiddenNames.some((pattern) => pattern.test(entry.name))) errors.push(`Forbidden packaged file: ${entry.name}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, levels: summaries }, null, 2));
}
