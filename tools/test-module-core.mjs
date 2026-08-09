import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.foundry = { utils: { lineSegmentIntersects: () => false } };
const { normalizeActorName, actorSpecs } = await import("../cyren-dotmm-populator/scripts/actor-resolver.js");
const { expectedPopulationKeys, planPopulation } = await import("../cyren-dotmm-populator/scripts/placement-engine.js");
const { validateLevelData, verifyTokenOnlyMutation } = await import("../cyren-dotmm-populator/scripts/validation.js");

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

console.log(JSON.stringify({ ok: true, plans }, null, 2));
