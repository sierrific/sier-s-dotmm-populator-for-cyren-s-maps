import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.foundry = { utils: { lineSegmentIntersects: () => false } };
const { normalizeActorName } = await import("../cyren-dotmm-populator/scripts/actor-resolver.js");
const { expectedPopulationKeys, planPopulation } = await import("../cyren-dotmm-populator/scripts/placement-engine.js");
const { validateLevelData, verifyTokenOnlyMutation } = await import("../cyren-dotmm-populator/scripts/validation.js");

const level = JSON.parse(fs.readFileSync("cyren-dotmm-populator/data/level-01.json", "utf8"));
assert.equal(normalizeActorName("Kélim—the Weasel"), "kelim the weasel");
assert.equal(validateLevelData(level).ok, true);
assert.equal(expectedPopulationKeys(level).size, 133);

const actors = new Map();
for (const encounter of level.encounters) for (const spec of encounter.tokens) {
  actors.set(spec.actorKey, { status: "resolved", document: { prototypeToken: { width: 1, height: 1 } } });
}
const anchors = new Map(Object.entries(level.anchors).map(([area, anchor]) => [area, { status: "resolved", area, ...anchor }]));
const scene = { width: level.scene.width, height: level.scene.height, grid: { size: level.scene.grid }, tokens: [], walls: [] };
const completePlan = planPopulation(scene, level, actors, anchors);
assert.equal(completePlan.placements.length, 133);
assert.deepEqual(completePlan.skipped, []);

const missingAnchor = new Map(anchors);
missingAnchor.set("39", { status: "unresolved", area: "39" });
const guardedPlan = planPopulation(scene, level, actors, missingAnchor);
assert.equal(guardedPlan.placements.length, 132);
assert.deepEqual(guardedPlan.skipped.map((item) => item.reason), ["anchor-unresolved"]);

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

console.log(JSON.stringify({ ok: true, completePlan: completePlan.placements.length, guardedPlan: guardedPlan.placements.length }, null, 2));
