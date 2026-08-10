import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.foundry = { utils: { lineSegmentIntersects: () => false } };
const { normalizeActorName, actorSpecs } = await import("../cyren-dotmm-populator/scripts/actor-resolver.js");
const { expectedPopulationKeys, planPopulation } = await import("../cyren-dotmm-populator/scripts/placement-engine.js");
const { resolveAnchors } = await import("../cyren-dotmm-populator/scripts/anchor-resolver.js");
const { levelSceneDefinitions, scopeLevelData, sceneCanvasBounds } = await import("../cyren-dotmm-populator/scripts/scene-resolver.js");
const { validateLevelData, fingerprintScene, verifyTokenOnlyMutation } = await import("../cyren-dotmm-populator/scripts/validation.js");

assert.equal(normalizeActorName("Kélim—the Weasel"), "kelim the weasel");

const expected = new Map([
  [1, 133], [2, 183], [3, 255], [4, 114], [5, 90], [6, 59], [7, 61], [8, 99],
  [9, 63], [10, 196], [11, 210], [12, 175], [13, 86], [14, 155], [15, 96],
  [16, 84], [17, 75], [18, 115], [19, 74], [20, 97], [21, 120], [22, 72], [23, 68]
]);
const plans = [];
for (const [levelNumber, tokenCount] of expected) {
  const level = JSON.parse(fs.readFileSync(`cyren-dotmm-populator/data/level-${String(levelNumber).padStart(2, "0")}.json`, "utf8"));
  assert.equal(validateLevelData(level).ok, true);
  assert.equal(expectedPopulationKeys(level).size, tokenCount);

  const actors = new Map();
  for (const spec of actorSpecs(level).values()) {
    actors.set(spec.actorKey, { status: "resolved", document: { prototypeToken: { width: 1, height: 1 } } });
  }
  let complete = 0;
  let guarded = 0;
  for (const definition of levelSceneDefinitions(level)) {
    const scoped = scopeLevelData(level, definition.key);
    const anchors = new Map(Object.entries(scoped.anchors).map(([area, anchor]) => [area, { status: "resolved", area, ...anchor }]));
    const scene = { width: definition.width, height: definition.height, padding: definition.padding ?? 0, grid: { size: definition.grid }, tokens: [], walls: [] };
    const completePlan = planPopulation(scene, scoped, actors, anchors);
    const scopedCount = scoped.encounters.flatMap((encounter) => encounter.tokens).reduce((sum, token) => sum + token.count, 0);
    assert.equal(completePlan.placements.length, scopedCount, `Level ${levelNumber}/${definition.key} should place every token on an empty wall-free Scene.`);
    assert.deepEqual(completePlan.skipped, []);
    complete += completePlan.placements.length;

    const firstArea = scoped.encounters[0]?.area;
    if (firstArea) {
      const missingAnchor = new Map(anchors);
      missingAnchor.set(firstArea, { status: "unresolved", area: firstArea });
      const guardedPlan = planPopulation(scene, scoped, actors, missingAnchor);
      assert(guardedPlan.placements.length < completePlan.placements.length);
      assert(guardedPlan.skipped.every((item) => item.area === firstArea && item.reason === "anchor-unresolved"));
      guarded += guardedPlan.placements.length;
    }
  }
  assert.equal(complete, tokenCount);
  plans.push({ level: levelNumber, complete, guarded });
}

const safe = verifyTokenOnlyMutation(
  { tokens: ["a"], walls: ["w"], lights: [], tiles: [], notes: [], sounds: [], drawings: [], regions: [] },
  { tokens: ["a", "b"], walls: ["w"], lights: [], tiles: [], notes: [], sounds: [], drawings: [], regions: [] },
  { created: ["b"] }
);
assert.equal(safe.ok, true);
const unsafe = verifyTokenOnlyMutation(
  { tokens: [], walls: ["w"], lights: [], tiles: [], notes: [], sounds: [], drawings: [], regions: [] },
  { tokens: [], walls: [], lights: [], tiles: [], notes: [], sounds: [], drawings: [], regions: [] }
);
assert.equal(unsafe.ok, false);

const partialLevel = {
  level: 99,
  scene: { width: 700, height: 700, grid: 70 },
  anchors: { "1": { x: 350, y: 350 } },
  encounters: [{
    id: "partial-host",
    area: "1",
    radius: 1,
    tokens: [
      { actorKey: "host", actor: "Host", count: 1 },
      { actorKey: "passenger", actor: "Passenger", count: 1, stackWith: "host" }
    ]
  }]
};
const partialScene = {
  width: 700,
  height: 700,
  grid: { size: 70 },
  walls: [],
  tokens: [{
    id: "existing-host",
    x: 280,
    y: 280,
    width: 1,
    height: 1,
    flags: { "cyren-dotmm-populator": { level: 99, area: "1", encounterId: "partial-host", actorKey: "host", instance: 1 } }
  }]
};
const partialActors = new Map([
  ["host", { status: "resolved", document: { prototypeToken: { width: 1, height: 1 } } }],
  ["passenger", { status: "resolved", document: { prototypeToken: { width: 1, height: 1 } } }]
]);
const partialAnchors = new Map([["1", { status: "resolved", area: "1", x: 350, y: 350 }]]);
const partialPlan = planPopulation(partialScene, partialLevel, partialActors, partialAnchors);
assert.equal(partialPlan.placements.length, 1);
assert.equal(partialPlan.placements[0].spec.actorKey, "passenger");
assert.equal(partialPlan.placements[0].x, 280);
assert.equal(partialPlan.placements[0].y, 280);

globalThis.game = { settings: { get: () => ({ "Scene.test": { "1": { x: 420, y: 490 } } }) } };
const manualScene = { id: "test", uuid: "Scene.test", width: 700, height: 700, grid: { size: 70 }, tiles: [] };
const manualLevel = { scene: { width: 700, height: 700, grid: 70 }, anchors: { "1": { x: 350, y: 350 } }, encounters: [{ area: "1" }] };
const manualAnchors = resolveAnchors(manualScene, manualLevel);
assert.equal(manualAnchors.get("1").source, "manual");
assert.equal(manualAnchors.get("1").x, 420);

const wallBefore = { id: "wall", toObject: () => ({ _id: "wall", c: [0, 0, 70, 0] }) };
const wallAfter = { id: "wall", toObject: () => ({ _id: "wall", c: [0, 0, 140, 0] }) };
const fingerprintBefore = fingerprintScene({ id: "scene", tokens: [], walls: [wallBefore] });
const fingerprintAfter = fingerprintScene({ id: "scene", tokens: [], walls: [wallAfter] });
assert.equal(verifyTokenOnlyMutation(fingerprintBefore, fingerprintAfter).ok, false);

const multiLevel = {
  level: 3,
  scenes: [
    { key: "west", names: ["Level 03 (1)"], width: 700, height: 700, grid: 70 },
    { key: "east", names: ["Level 03 (2)"], width: 700, height: 700, padding: 0.25, grid: 70 }
  ],
  anchors: {
    "1": { sceneKey: "west", x: 350, y: 350 },
    "2": { sceneKey: "east", x: 840, y: 350 }
  },
  encounters: [
    { id: "west-one", sceneKey: "west", area: "1", tokens: [{ actorKey: "host", actor: "Host", count: 1 }] },
    { id: "east-two", sceneKey: "east", area: "2", tokens: [{ actorKey: "host", actor: "Host", count: 1 }] }
  ]
};
assert.equal(validateLevelData(multiLevel).ok, true);
const eastData = scopeLevelData(multiLevel, "east");
assert.equal(eastData.encounters.length, 1);
assert.equal(eastData.encounters[0].id, "east-two");
assert.deepEqual(Object.keys(eastData.anchors), ["2"]);
const paddedScene = { width: 700, height: 700, padding: 0.25, grid: { size: 70 }, tokens: [], walls: [] };
assert.deepEqual(sceneCanvasBounds(paddedScene), { width: 1050, height: 1050 });
const paddedPlan = planPopulation(paddedScene, eastData, new Map([["host", partialActors.get("host")]]), new Map([["2", { status: "resolved", area: "2", x: 840, y: 350 }]]));
assert.equal(paddedPlan.placements.length, 1);

console.log(JSON.stringify({ ok: true, plans, partialRecovery: true, manualAnchorOverride: true, contentFingerprint: true, multiScene: true, paddedCanvas: true }, null, 2));
