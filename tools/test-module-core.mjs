import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.foundry = { utils: { lineSegmentIntersects: () => false } };
const { normalizeActorName, actorSpecs } = await import("../cyren-dotmm-populator/scripts/actor-resolver.js");
const { expectedPopulationKeys, planPopulation } = await import("../cyren-dotmm-populator/scripts/placement-engine.js");
const { resolveAnchors } = await import("../cyren-dotmm-populator/scripts/anchor-resolver.js");
const { validateLevelData, fingerprintScene, verifyTokenOnlyMutation } = await import("../cyren-dotmm-populator/scripts/validation.js");

assert.equal(normalizeActorName("Kélim—the Weasel"), "kelim the weasel");

const expected = new Map([[1, 133], [2, 183]]);
const plans = [];
for (const [levelNumber, tokenCount] of expected) {
  const level = JSON.parse(fs.readFileSync(`cyren-dotmm-populator/data/level-${String(levelNumber).padStart(2, "0")}.json`, "utf8"));
  assert.equal(validateLevelData(level).ok, true);
  assert.equal(expectedPopulationKeys(level).size, tokenCount);

  const actors = new Map();
  for (const spec of actorSpecs(level).values()) {
    actors.set(spec.actorKey, { status: "resolved", document: { prototypeToken: { width: 1, height: 1 } } });
  }
  const anchors = new Map(Object.entries(level.anchors).map(([area, anchor]) => [area, { status: "resolved", area, ...anchor }]));
  const scene = { width: level.scene.width, height: level.scene.height, grid: { size: level.scene.grid }, tokens: [], walls: [] };
  const completePlan = planPopulation(scene, level, actors, anchors);
  assert.equal(completePlan.placements.length, tokenCount, `Level ${levelNumber} should place every token on an empty wall-free Scene.`);
  assert.deepEqual(completePlan.skipped, []);

  const firstArea = level.encounters[0].area;
  const missingAnchor = new Map(anchors);
  missingAnchor.set(firstArea, { status: "unresolved", area: firstArea });
  const guardedPlan = planPopulation(scene, level, actors, missingAnchor);
  assert(guardedPlan.placements.length < completePlan.placements.length);
  assert(guardedPlan.skipped.every((item) => item.area === firstArea && item.reason === "anchor-unresolved"));
  plans.push({ level: levelNumber, complete: completePlan.placements.length, guarded: guardedPlan.placements.length });
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

console.log(JSON.stringify({ ok: true, plans, partialRecovery: true, manualAnchorOverride: true, contentFingerprint: true }, null, 2));
