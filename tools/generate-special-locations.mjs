import fs from "node:fs";
import path from "node:path";
import { ClassicLevel } from "classic-level";

const ROOT = path.resolve("cyren-dotmm-populator");
const CYREN_DB = path.resolve(".discovery-temp/cyren/maps");
const REFERENCE_FILE = path.resolve(".discovery-temp/reference/ddb-third-party-wdmm.json");
const SOURCE_PREFERENCE = ["XMM", "MPMM", "MM"];

const LOCATIONS = [
  {
    contentId: "skullport-lower-middle",
    label: "Skullport — Lower & Middle",
    title: "Skullport Lower and Middle Levels",
    sceneName: "Skullport - Lower & Middle"
  },
  {
    contentId: "skullport-skull-island",
    label: "Skullport — Skull Island",
    title: "Skull Island",
    sceneName: "Skullport - Skull Island"
  },
  {
    contentId: "skullport-upper",
    label: "Skullport — Upper",
    title: "Skullport Upper Level",
    sceneName: "Skullport - Upper"
  }
];

const MODERN_RESOLUTION_NAMES = new Map([
  ["bandit captain", ["Bandit Captain", "Bandit Deceiver"]],
  ["bugbear", ["Bugbear Warrior", "Bugbear"]],
  ["drow", ["Drow Warrior", "Drow"]],
  ["goblin", ["Goblin Warrior", "Goblin"]],
  ["orc", ["Orc Warrior", "Orc"]],
  ["thug", ["Tough", "Thug"]]
]);

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "actor";
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
      if (sceneMatch && LOCATIONS.some((location) => location.sceneName === value?.name)) scenes.set(sceneMatch[1], value);
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
    const key = JSON.stringify([assignment.area, actor, tokenName, width, height, disposition, hidden]);
    if (!groups.has(key)) groups.set(key, { area: assignment.area, actor, tokenName, width, height, disposition, hidden, positions: [] });
    groups.get(key).positions.push({ x: Number(token.x), y: Number(token.y) });
    diagnostics.push({ ...assignment, actor, center });
  }
  return { groups: [...groups.values()], diagnostics };
}

function buildSceneDefinition(scene) {
  return {
    key: "main",
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
  return spec;
}

function buildLocation(location, referenceScene, cyrenScene) {
  const { groups, diagnostics } = groupTokens(referenceScene, cyrenScene);
  const byArea = new Map();
  for (const group of groups) {
    if (!byArea.has(group.area)) byArea.set(group.area, []);
    byArea.get(group.area).push(group);
  }
  const anchors = {};
  const encounters = [];
  for (const [area, areaGroups] of [...byArea].toSorted(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))) {
    const centers = areaGroups.flatMap((group) => group.positions.map((position) => ({
      x: position.x + group.width * cyrenScene.grid / 2,
      y: position.y + group.height * cyrenScene.grid / 2
    })));
    const centroid = {
      x: centers.reduce((sum, point) => sum + point.x, 0) / centers.length,
      y: centers.reduce((sum, point) => sum + point.y, 0) / centers.length
    };
    const anchor = cyrenScene.anchors
      .filter((candidate) => candidate.area === area)
      .toSorted((left, right) => distanceSquared(centroid, left) - distanceSquared(centroid, right))[0];
    if (!anchor) throw new Error(`${referenceScene.name}: no Cyren anchor for area ${area}.`);
    anchors[area] = { x: anchor.x, y: anchor.y };

    const actorKeyCounts = new Map();
    const tokens = areaGroups
      .toSorted((left, right) => left.actor.localeCompare(right.actor) || left.tokenName.localeCompare(right.tokenName))
      .map((group) => {
        const base = slug(group.actor);
        const number = (actorKeyCounts.get(base) ?? 0) + 1;
        actorKeyCounts.set(base, number);
        return tokenSpec(group, number === 1 ? base : `${base}-${number}`);
      });
    encounters.push({
      id: `${location.contentId}-a${area}`,
      area,
      radius: 4,
      tokens
    });
  }

  return {
    data: {
      schemaVersion: 1,
      contentId: location.contentId,
      label: location.label,
      title: location.title,
      actorSourcePreference: SOURCE_PREFERENCE,
      scene: buildSceneDefinition(cyrenScene),
      anchors,
      encounters
    },
    diagnostics
  };
}

const reference = JSON.parse(fs.readFileSync(REFERENCE_FILE, "utf8"));
const cyrenScenes = await readCyrenScenes();
const report = [];

for (const location of LOCATIONS) {
  const referenceScene = reference.scenes.find((scene) => scene.name === location.sceneName);
  const cyrenScene = cyrenScenes.find((scene) => scene.name === location.sceneName);
  if (!referenceScene) throw new Error(`Missing reference Scene: ${location.sceneName}.`);
  if (!cyrenScene) throw new Error(`Missing Cyren Scene: ${location.sceneName}.`);
  const { data, diagnostics } = buildLocation(location, referenceScene, cyrenScene);
  const output = path.join(ROOT, "data", `${location.contentId}.json`);
  fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const distances = diagnostics.map((item) => item.noteDistance).filter(Number.isFinite).toSorted((a, b) => a - b);
  report.push({
    contentId: location.contentId,
    scene: location.sceneName,
    encounters: data.encounters.length,
    tokens: data.encounters.flatMap((encounter) => encounter.tokens).reduce((sum, token) => sum + token.count, 0),
    actors: new Set(data.encounters.flatMap((encounter) => encounter.tokens.map((token) => token.actor))).size,
    anchors: Object.keys(data.anchors).length,
    noteAssignmentFallbacks: diagnostics.filter((item) => item.usedFallback).length,
    medianNoteDistance: distances.length ? Math.round(distances[Math.floor(distances.length / 2)]) : null,
    maxNoteDistance: distances.length ? Math.round(distances.at(-1)) : null
  });
}

console.log(JSON.stringify({ ok: true, locations: report }, null, 2));
