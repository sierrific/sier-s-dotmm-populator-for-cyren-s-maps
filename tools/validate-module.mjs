import fs from "node:fs";
import path from "node:path";

const root = path.resolve("cyren-dotmm-populator");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "module.json"), "utf8"));
const packageMetadata = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
const constants = fs.readFileSync(path.join(root, "scripts", "constants.js"), "utf8");
const expectedLevels = new Map([
  [1, { encounters: 33, staticTokens: 133, anchors: 33 }],
  [2, { encounters: 48, staticTokens: 183, anchors: 47 }]
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
  if (!expected) {
    errors.push(`Unexpected level dataset: ${level.level}`);
    continue;
  }
  if (level.encounters.length !== expected.encounters) errors.push(`Level ${level.level}: expected ${expected.encounters} encounter groups, got ${level.encounters.length}.`);
  const count = level.encounters.flatMap((encounter) => encounter.tokens).reduce((sum, token) => sum + token.count, 0);
  if (count !== expected.staticTokens) errors.push(`Level ${level.level}: expected ${expected.staticTokens} static token instances, got ${count}.`);
  if (Object.keys(level.anchors ?? {}).length !== expected.anchors) errors.push(`Level ${level.level}: expected ${expected.anchors} fallback anchors.`);
  if (JSON.stringify(level.actorSourcePreference) !== JSON.stringify(["XMM", "MPMM", "MM"])) errors.push(`Level ${level.level}: unexpected modern-source preference.`);

  const keys = new Set();
  const encounterIds = new Set();
  const actorKeys = new Set();
  for (const encounter of level.encounters) {
    if (encounterIds.has(encounter.id)) errors.push(`Duplicate encounter id: ${encounter.id}`);
    encounterIds.add(encounter.id);
    if (!/^\d+(?:[a-z]|-[a-z0-9]+)?$/i.test(encounter.area)) errors.push(`Malformed area id: ${encounter.area}`);
    if (!level.anchors[encounter.area]) errors.push(`Unresolved static anchor: Level ${level.level}/${encounter.area}`);
    for (const token of encounter.tokens) {
      actorKeys.add(token.actorKey);
      if (!String(token.actorKey ?? "").trim()) errors.push(`Missing actor key in ${encounter.id}.`);
      if (!String(token.actor ?? "").trim()) errors.push(`Missing actor name in ${encounter.id}.`);
      if (!Number.isInteger(token.count) || token.count < 1) errors.push(`Invalid token count in ${encounter.id}.`);
      if (token.tokenWidth !== undefined && (!Number.isFinite(token.tokenWidth) || token.tokenWidth <= 0)) errors.push(`Invalid token width in ${encounter.id}.`);
      if (token.tokenHeight !== undefined && (!Number.isFinite(token.tokenHeight) || token.tokenHeight <= 0)) errors.push(`Invalid token height in ${encounter.id}.`);
      for (let instance = 1; instance <= token.count; instance += 1) {
        const key = `${level.level}|${encounter.area}|${encounter.id}|${token.actorKey}|${instance}`;
        if (keys.has(key)) errors.push(`Duplicate population key: ${key}`);
        keys.add(key);
      }
    }
  }

  for (const [area, anchor] of Object.entries(level.anchors)) {
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) errors.push(`Non-numeric anchor: Level ${level.level}/${area}`);
    if (anchor.x < 0 || anchor.y < 0 || anchor.x >= level.scene.width || anchor.y >= level.scene.height) {
      errors.push(`Out-of-bounds anchor: Level ${level.level}/${area}`);
    }
  }

  if (level.level === 1 && (level.anchors["39"]?.x !== 6020 || level.anchors["39"]?.y !== 12180)) errors.push("Level 1 area 39 must resolve to the center of Cyren tile 39a.");
  if (level.level === 2 && (level.anchors["11b"]?.x !== 9870 || level.anchors["11b"]?.y !== 4690)) errors.push("Level 2 area 11b must use the verified in-bounds fallback.");
  inspectDerivedData(level, `level-${String(level.level).padStart(2, "0")}`);
  summaries.push({ level: level.level, encounters: level.encounters.length, staticTokens: count, actorTypes: actorKeys.size, anchors: Object.keys(level.anchors).length, uniqueKeys: keys.size });
}

const forbiddenNames = [/adventure-wdmm/i, /5etools/i, /\.ldb$/i, /\.(?:webp|png|jpe?g|pdf)$/i];
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
