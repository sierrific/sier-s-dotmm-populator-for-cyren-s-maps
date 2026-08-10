import fs from "node:fs";
import path from "node:path";
import { ClassicLevel } from "classic-level";

const ROOT = path.resolve("cyren-dotmm-populator");
const CYREN_DB = path.resolve(".discovery-temp/cyren/maps");
const REFERENCE_FILE = path.resolve(".discovery-temp/reference/ddb-third-party-wdmm.json");
const FIRST_LEVEL = 3;
const LAST_LEVEL = 23;
const SOURCE_PREFERENCE = ["XMM", "MPMM", "MM"];

const LEVEL_TITLES = new Map([
  [3, "Sargauth Level"], [4, "Twisted Caverns"], [5, "Wyllowwood"],
  [6, "Lost Level"], [7, "Maddgoth's Castle"], [8, "Slitherswamp"],
  [9, "Dweomercore"], [10, "Muiral's Gauntlet"], [11, "Troglodyte Warrens"],
  [12, "Maze Level"], [13, "Trobriand's Graveyard"], [14, "Arcturiadoom"],
  [15, "Obstacle Course"], [16, "Crystal Labyrinth"], [17, "Seadeeps"],
  [18, "Vanrakdoom"], [19, "Caverns of Ooze"], [20, "Runestone Caverns"],
  [21, "Terminus Level"], [22, "Shadowdusk Hold"], [23, "Mad Wizard's Lair"]
]);

const MODERN_RESOLUTION_NAMES = new Map([
  ["animated flying sword", ["Animated Flying Sword", "Flying Sword"]],
  ["bandit captain", ["Bandit Captain", "Bandit Deceiver"]],
  ["bugbear", ["Bugbear Warrior", "Bugbear"]],
  ["drow", ["Drow Warrior", "Drow"]],
  ["goblin", ["Goblin Warrior", "Goblin"]],
  ["orc", ["Orc Warrior", "Orc"]],
  ["thug", ["Tough", "Thug"]]
]);

const ACTOR_ALIASES = new Map([
  ["animated-statue", ["Archmage"]],
  ["animated-staff-of-frost", ["Animated Flying Sword", "Flying Sword"]],
  ["astyrranthor", ["Adult Red Dragon"]],
  ["bone-devil-polearm-variant", ["Bone Devil"]],
  ["bone-naga", ["Bone Naga (Spirit)"]],
  ["darribeth-meltimer", ["Mage"]],
  ["derrion-shadowdusk", ["Champion"]],
  ["drow-assassin", ["Assassin"]],
  ["drider-variant", ["Drider"]],
  ["faerie-dragon-older", ["Faerie Dragon (Violet)", "Faerie Dragon"]],
  ["giant-lizard-variant", ["Giant Lizard"]],
  ["halfling-musician", ["Commoner"]],
  ["hammer-handed-golem", ["Stone Golem"]],
  ["mutated-drow", ["Cloud Giant"]],
  ["psychic-gray-ooze", ["Gray Ooze"]],
  ["turbulence", ["Mage"]],
  ["violence", ["Mage"]]
]);

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "actor";
}

function levelNumber(name) {
  return Number(String(name ?? "").match(/^Level\s+(\d{2})/i)?.[1] ?? NaN);
}

function scenePart(name) {
  return Number(String(name ?? "").match(/\((\d+)\)/)?.[1] ?? 1);
}

function sceneKey(name, level) {
  return level === 3 ? `part-${scenePart(name)}` : "main";
}

function areaFromLabel(label) {
  const match = String(label ?? "").trim().match(/^0*(\d{1,3})([a-z])?(?=\.|\s|$)/i);
  return match ? `${Number(match[1])}${(match[2] ?? "").toLowerCase()}` : null;
}

function areaFromTile(tile) {
  const source = decodeURIComponent(String(tile.texture?.src ?? tile.img ?? ""));
  const match = source.match(/number tokens\/[^/]*?([0-9]+[a-z]?)(?:\.[a-z0-9]+)?$/i);
  if (!match) return null;
  const parsed = match[1].match(/^(\d+)([a-z]?)$/i);
  return `${Number(parsed[1])}${(parsed[2] ?? "").toLowerCase()}`;
}

function distanceSquared(left, right) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}

function groupBy(items, selector) {
  const result = new Map();
  for (const item of items) {
    const key = selector(item);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
  }
  return result;
}

function tokenCenter(token, grid) {
  return {
    x: Number(token.x) + Number(token.width ?? 1) * grid / 2,
    y: Number(token.y) + Number(token.height ?? 1) * grid / 2
  };
}

async function readCyrenScenes() {
  const database = new ClassicLevel(CYREN_DB, {
    createIfMissing: false,
    keyEncoding: "utf8",
    valueEncoding: "utf8"
  });
  await database.open();
  try {
    const scenes = new Map();
    const embeddedTiles = new Map();
    for await (const [key, raw] of database.iterator()) {
      const value = JSON.parse(raw);
      const sceneMatch = key.match(/^!scenes!([^.]+)$/);
      if (sceneMatch && /^Level\s+\d+/i.test(value?.name ?? "")) scenes.set(sceneMatch[1], value);
      const tileMatch = key.match(/^!scenes\.tiles!([^.]+)\./);
      if (tileMatch) {
        if (!embeddedTiles.has(tileMatch[1])) embeddedTiles.set(tileMatch[1], []);
        embeddedTiles.get(tileMatch[1]).push(value);
      }
    }
    return [...scenes.entries()].map(([id, scene]) => {
      const tiles = Array.from(new Map(
        [...(scene.tiles ?? []), ...(embeddedTiles.get(id) ?? [])].map((tile) => [tile._id ?? tile.id, tile])
      ).values());
      return {
        id,
        name: scene.name,
        sourceId: scene.flags?.["scene-packer"]?.sourceId ?? null,
        width: Number(scene.width),
        height: Number(scene.height),
        padding: Number(scene.padding ?? 0),
        grid: Number(scene.grid?.size ?? scene.grid),
        anchors: tiles.map((tile) => ({
          area: areaFromTile(tile),
          x: Number(tile.x) + Number(tile.width) / 2,
          y: Number(tile.y) + Number(tile.height) / 2
        })).filter((anchor) => anchor.area)
      };
    });
  } finally {
    await database.close();
  }
}

function noteMarkers(scene) {
  return (scene.flags?.ddb?.notes ?? []).flatMap((note) => {
    const area = areaFromLabel(note.label);
    return area ? (note.positions ?? []).map((position) => ({ area, x: Number(position.x), y: Number(position.y) })) : [];
  });
}

function chooseArea(center, markers, anchors) {
  const nearestMarker = markers.toSorted((left, right) => distanceSquared(center, left) - distanceSquared(center, right))[0];
  if (nearestMarker && anchors.some((anchor) => anchor.area === nearestMarker.area)) {
    return { area: nearestMarker.area, noteDistance: Math.sqrt(distanceSquared(center, nearestMarker)), usedFallback: false };
  }
  const nearestAnchor = anchors.toSorted((left, right) => distanceSquared(center, left) - distanceSquared(center, right))[0];
  if (!nearestAnchor) throw new Error("No numbered Cyren anchor is available for a token.");
  return { area: nearestAnchor.area, noteDistance: null, usedFallback: true };
}

function actorName(token) {
  return String(token.flags?.ddbActorFlags?.name ?? token.name ?? "").trim();
}

function groupTokens(referenceScene, cyrenScene) {
  const markers = noteMarkers(referenceScene);
  const groups = new Map();
  const diagnostics = [];
  for (const token of referenceScene.flags?.ddb?.tokens ?? []) {
    const center = tokenCenter(token, cyrenScene.grid);
    const assignment = chooseArea(center, markers, cyrenScene.anchors);
    const actor = actorName(token);
    if (!actor) throw new Error(`${referenceScene.name}: token without a resolvable actor name.`);
    const tokenName = String(token.name ?? actor).trim();
    const width = Number(token.width ?? 1);
    const height = Number(token.height ?? 1);
    const disposition = Number(token.disposition ?? -1);
    const hidden = Boolean(token.hidden);
    const groupKey = JSON.stringify([assignment.area, actor, tokenName, width, height, disposition, hidden]);
    if (!groups.has(groupKey)) groups.set(groupKey, {
      area: assignment.area,
      actor,
      tokenName,
      width,
      height,
      disposition,
      hidden,
      positions: []
    });
    groups.get(groupKey).positions.push({ x: Number(token.x), y: Number(token.y) });
    diagnostics.push({ ...assignment, area: assignment.area, actor, center });
  }
  return { groups: [...groups.values()], diagnostics };
}

function buildSceneDefinition(scene, key) {
  return {
    key,
    names: [scene.name, `${scene.name} (Copy)`],
    sourceId: scene.sourceId,
    width: scene.width,
    height: scene.height,
    padding: scene.padding,
    grid: scene.grid
  };
}

function tokenSpec(group, actorKey) {
  const spec = {
    actorKey,
    actor: group.actor,
    count: group.positions.length,
    disposition: group.disposition,
    hidden: group.hidden,
    positions: group.positions.toSorted((left, right) => left.y - right.y || left.x - right.x)
  };
  if (group.tokenName !== group.actor) spec.tokenName = group.tokenName;
  if (group.width !== 1) spec.tokenWidth = group.width;
  if (group.height !== 1) spec.tokenHeight = group.height;
  const modernNames = MODERN_RESOLUTION_NAMES.get(slug(group.actor).replaceAll("-", " "));
  if (modernNames) spec.resolutionNames = modernNames;
  const aliases = ACTOR_ALIASES.get(slug(group.actor));
  if (aliases) {
    spec.aliases = aliases;
    spec.tokenName = group.tokenName;
  }
  return spec;
}

function buildLevel(level, scenePairs) {
  const split = scenePairs.length > 1;
  const scenes = scenePairs.map(({ cyren, key }) => buildSceneDefinition(cyren, key));
  const encounters = [];
  const anchors = {};
  const diagnostics = [];

  for (const { reference, cyren, key } of scenePairs) {
    const grouped = groupTokens(reference, cyren);
    diagnostics.push(...grouped.diagnostics.map((item) => ({ ...item, scene: reference.name })));
    const byArea = groupBy(grouped.groups, (group) => group.area);
    for (const [area, groups] of [...byArea].toSorted(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))) {
      const allPositions = groups.flatMap((group) => group.positions.map((position) => ({
        x: position.x + group.width * cyren.grid / 2,
        y: position.y + group.height * cyren.grid / 2
      })));
      const centroid = {
        x: allPositions.reduce((sum, point) => sum + point.x, 0) / allPositions.length,
        y: allPositions.reduce((sum, point) => sum + point.y, 0) / allPositions.length
      };
      const candidates = cyren.anchors.filter((candidate) => candidate.area === area);
      const anchor = candidates.toSorted((left, right) => distanceSquared(centroid, left) - distanceSquared(centroid, right))[0];
      if (!anchor) throw new Error(`${reference.name}: no Cyren anchor for area ${area}.`);
      const anchorKey = area;
      anchors[anchorKey] = split ? { sceneKey: key, x: anchor.x, y: anchor.y } : { x: anchor.x, y: anchor.y };

      const actorKeyCounts = new Map();
      const tokens = groups.toSorted((left, right) => left.actor.localeCompare(right.actor) || left.tokenName.localeCompare(right.tokenName)).map((group) => {
        const base = slug(group.actor);
        const number = (actorKeyCounts.get(base) ?? 0) + 1;
        actorKeyCounts.set(base, number);
        return tokenSpec(group, number === 1 ? base : `${base}-${number}`);
      });
      const encounter = {
        id: `l${String(level).padStart(2, "0")}-${split ? `p${scenePart(reference.name)}-` : ""}a${area}`,
        area: anchorKey,
        radius: 4,
        tokens
      };
      if (split) encounter.sceneKey = key;
      encounters.push(encounter);
    }
  }

  const data = {
    schemaVersion: 1,
    level,
    title: LEVEL_TITLES.get(level),
    actorSourcePreference: SOURCE_PREFERENCE,
    ...(split ? { scenes } : { scene: scenes[0] }),
    anchors,
    encounters
  };
  return { data, diagnostics };
}

const reference = JSON.parse(fs.readFileSync(REFERENCE_FILE, "utf8"));
const cyrenScenes = await readCyrenScenes();
const report = [];

for (let level = FIRST_LEVEL; level <= LAST_LEVEL; level += 1) {
  const references = reference.scenes
    .filter((scene) => levelNumber(scene.name) === level)
    .toSorted((left, right) => scenePart(left.name) - scenePart(right.name));
  const scenePairs = references.map((referenceScene) => {
    const cyren = cyrenScenes.find((scene) => scene.name === referenceScene.name);
    if (!cyren) throw new Error(`Missing Cyren scene metadata for ${referenceScene.name}.`);
    return { reference: referenceScene, cyren, key: sceneKey(referenceScene.name, level) };
  });
  if (!scenePairs.length) throw new Error(`No reference scenes found for Level ${level}.`);
  const { data, diagnostics } = buildLevel(level, scenePairs);
  const output = path.join(ROOT, "data", `level-${String(level).padStart(2, "0")}.json`);
  fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const distances = diagnostics.map((item) => item.noteDistance).filter(Number.isFinite).toSorted((a, b) => a - b);
  report.push({
    level,
    scenes: scenePairs.map(({ reference: scene }) => scene.name),
    encounters: data.encounters.length,
    tokens: data.encounters.flatMap((encounter) => encounter.tokens).reduce((sum, token) => sum + token.count, 0),
    actors: new Set(data.encounters.flatMap((encounter) => encounter.tokens.map((token) => token.actor))).size,
    anchors: Object.keys(data.anchors).length,
    noteAssignmentFallbacks: diagnostics.filter((item) => item.usedFallback).length,
    medianNoteDistance: distances.length ? Math.round(distances[Math.floor(distances.length / 2)]) : null,
    maxNoteDistance: distances.length ? Math.round(distances.at(-1)) : null
  });
}

console.log(JSON.stringify({ ok: true, levels: report }, null, 2));
