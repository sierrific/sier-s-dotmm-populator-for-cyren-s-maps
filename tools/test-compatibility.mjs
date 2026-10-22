// API-contract tests with test doubles, not a substitute for a licensed Foundry runtime.
import assert from "node:assert/strict";
import fs from "node:fs";
import { MODULE_ID, SETTINGS } from "../cyren-dotmm-populator/scripts/constants.js";

const settings = new Map();
const notices = [];
const confirmations = [];
let confirmation = false;
class ApplicationV2 {
  async render(options) { this.lastRender = options; return this; }
  async _onRender() {}
  async close() { this.closed = true; }
}
globalThis.foundry = {
  utils: { deepClone: structuredClone, lineSegmentIntersects: () => false },
  documents: {},
  applications: { api: {
    ApplicationV2,
    HandlebarsApplicationMixin: (base) => class extends base {},
    DialogV2: { async confirm(options) { confirmations.push(options); return confirmation; } }
  } }
};
globalThis.game = {
  release: { generation: 14 }, user: { isGM: true }, system: { id: "dnd5e" },
  modules: new Map([["cyrensmaps-wdmm", { active: true }], [MODULE_ID, {}]]),
  settings: {
    get: (_module, key) => settings.get(key),
    async set(_module, key, value) { settings.set(key, value); }
  }
};
globalThis.ui = { notifications: {
  info: (message) => notices.push(message), error: (message) => { throw new Error(message); }
} };
globalThis.CONFIG = {};

const { addPopulatorControl, coreGeneration, resolveUuid, documentClass, sceneLevelData } = await import("../cyren-dotmm-populator/scripts/compatibility.js");
const { validateEnvironment, fingerprintScene, verifyTokenOnlyMutation } = await import("../cyren-dotmm-populator/scripts/validation.js");
const { tileAnchor } = await import("../cyren-dotmm-populator/scripts/anchor-resolver.js");
const { scoreScene } = await import("../cyren-dotmm-populator/scripts/scene-resolver.js");
const { populateMissing, rebuild } = await import("../cyren-dotmm-populator/scripts/populator.js");
const { makeTokenFlag } = await import("../cyren-dotmm-populator/scripts/flags.js");
const { CyrenPopulatorApp, openPopulator, clearPreview } = await import("../cyren-dotmm-populator/scripts/ui.js");
const { authorAnchor, cancelAnchorAuthoring } = await import("../cyren-dotmm-populator/scripts/anchor-authoring.js");
const { createMissingSafetyCopies } = await import("../cyren-dotmm-populator/scripts/safety-copies.js");
const completed = [];
async function check(name, fn) { await fn(); completed.push(name); }

await check("v12 array and v13/v14 keyed controls, deduplication and GM guard", async () => {
  for (const generation of [12, 13, 14]) {
    game.release.generation = generation;
    assert.equal(coreGeneration(), generation);
    assert.equal(validateEnvironment().ok, true);
    const controls = generation === 12 ? [{ name: "token", tools: [] }] : { tokens: { tools: {} } };
    let opened = 0;
    const open = () => opened++;
    addPopulatorControl(controls, open);
    addPopulatorControl(controls, open);
    const tools = generation === 12 ? controls[0].tools : Object.values(controls.tokens.tools);
    assert.equal(tools.length, 1);
    assert.equal(tools[0].title, "Sier's DotMM Populator for Cyren's Maps");
    (tools[0].onChange ?? tools[0].onClick)();
    assert.equal(opened, 1);
  }
  game.release.generation = 15;
  assert.equal(validateEnvironment().ok, false);
  delete game.release;
  game.version = "14.368";
  assert.equal(coreGeneration(), 14);
  game.release = { generation: 14 };
  game.user.isGM = false;
  const controls = { tokens: { tools: {} } };
  addPopulatorControl(controls, () => assert.fail("Player control must not open."));
  assert.deepEqual(controls.tokens.tools, {});
  game.user.isGM = true;
});

await check("namespaced UUIDs and configured document subclasses with v12 fallback", async () => {
  globalThis.fromUuid = async (uuid) => `legacy:${uuid}`;
  assert.equal(await resolveUuid("Actor.one"), "legacy:Actor.one");
  foundry.utils.fromUuid = async (uuid) => `modern:${uuid}`;
  delete globalThis.fromUuid;
  assert.equal(await resolveUuid("Actor.one"), "modern:Actor.one");
  globalThis.Actor = class LegacyActor {};
  assert.equal(documentClass("Actor"), Actor);
  foundry.documents.Actor = class ModernActor {};
  assert.equal(documentClass("Actor"), foundry.documents.Actor);
  CONFIG.Actor = { documentClass: class SystemActor {} };
  assert.equal(documentClass("Actor"), CONFIG.Actor.documentClass);
  delete globalThis.Actor;
});

await check("tile centers before and after v14 migration, including rotated custom anchors", () => {
  const tile = { id: "marker", x: 100, y: 200, width: 80, height: 40, rotation: 90 };
  for (const generation of [12, 13]) {
    game.release.generation = generation;
    assert.deepEqual(tileAnchor(tile), { x: 140, y: 220, radius: null, source: "cyren-tile", tileId: "marker" });
  }
  game.release.generation = 14;
  assert.deepEqual(tileAnchor({ ...tile, x: 140, y: 220 }), { x: 140, y: 220, radius: null, source: "cyren-tile", tileId: "marker" });
  const custom = tileAnchor({ ...tile, anchorX: 0, anchorY: 0, texture: { anchorX: 0.5, anchorY: 0.5 } });
  assert.equal(custom.x, 80);
  assert.equal(custom.y, 240);
  const expected = { names: ["Test"], width: 1000, height: 1000, grid: 100, padding: 0.25 };
  const scene = { name: "Test (Copy)", width: 1000, height: 1000, grid: { size: 100 }, padding: 0 };
  assert.equal(scoreScene(scene, expected).valid, false, "Changed padding must not reuse absolute coordinates.");
  scene.padding = 0.25;
  assert.equal(scoreScene(scene, expected).valid, true);
});

function makeScene(generation = 14) {
  let serial = 0;
  const scene = {
    id: "copy", uuid: "Scene.copy", name: "Test (Copy)", width: 1000, height: 1000, grid: { size: 100 },
    tokens: [], walls: [], tiles: [], writes: 0,
    levels: generation >= 14 ? [{ id: "native-level", toObject: () => ({ _id: "native-level", name: "Ground" }) }] : undefined,
    async createEmbeddedDocuments(type, rows) {
      assert.equal(type, "Token"); this.writes++;
      const tokens = rows.map((row) => {
        const data = { ...structuredClone(row), _id: row._id ?? `token-${++serial}` };
        return { ...data, id: data._id, parent: this, toObject: () => structuredClone(data) };
      });
      this.tokens.push(...tokens);
      return tokens;
    },
    async deleteEmbeddedDocuments(type, ids) {
      assert.equal(type, "Token"); this.writes++;
      this.tokens = this.tokens.filter((token) => !ids.includes(token.id));
    }
  };
  return scene;
}
const actorCalls = [];
const actor = {
  prototypeToken: { width: 1, height: 1 },
  async getTokenDocument(data, options) {
    actorCalls.push({ data, options });
    return { toObject: () => ({ _id: "prototype", name: "Creature", width: 1, height: 1, flags: { other: { keep: true } } }) };
  }
};
const flag = makeTokenFlag({ level: 1, area: "2", encounterId: "test", actorKey: "creature", instance: 1 });
const placement = { x: 200, y: 300, width: 2, height: 3, rect: { width: 200, height: 300 }, spec: {}, flag, actor };

await check("parent-aware Token creation, exact dimensions and native Scene Level assignment", async () => {
  for (const generation of [12, 13, 14]) {
    game.release.generation = generation;
    const scene = makeScene(generation);
    const result = await populateMissing(scene, { placements: [placement] });
    assert.equal(result.verification.ok, true);
    assert.equal(result.created[0].width, 2);
    assert.equal(result.created[0].height, 3);
    assert.equal(result.created[0].level, generation === 14 ? "native-level" : undefined);
    assert.equal(result.created[0].flags[MODULE_ID].level, 1, "Dungeon identity must not become a Scene Level ID.");
    assert.deepEqual(result.created[0].flags.other, { keep: true });
    assert.equal(actorCalls.at(-1).options.parent, scene);
    assert.notEqual(result.created[0].id, "prototype");
  }
});

await check("multi-level Scenes and non-GMs fail before mutation; Level content is fingerprinted", async () => {
  game.release.generation = 14;
  for (const levels of [[], [{ id: "one" }, { id: "two" }]]) {
    const scene = makeScene(); scene.levels = levels;
    assert.throws(() => sceneLevelData(scene), /exactly one Scene Level/);
    await assert.rejects(rebuild(scene, { placements: [placement] }, { level: 1 }), /exactly one Scene Level/);
    assert.equal(scene.writes, 0);
  }
  const scene = makeScene();
  game.user.isGM = false;
  await assert.rejects(populateMissing(scene, { placements: [placement] }), /GM-only/);
  assert.equal(scene.writes, 0);
  game.user.isGM = true;
  const before = fingerprintScene(scene);
  scene.levels[0].toObject = () => ({ _id: "native-level", name: "Changed" });
  assert.deepEqual(verifyTokenOnlyMutation(before, fingerprintScene(scene)).errors, ["levels changed unexpectedly."]);
});

await check("v14 rebuild rollback preserves original Token ID, native Level and unowned Tokens", async () => {
  const scene = makeScene();
  await populateMissing(scene, { placements: [placement] });
  await scene.createEmbeddedDocuments("Token", [{ name: "Player", x: 0, y: 0 }]);
  const before = fingerprintScene(scene);
  const create = scene.createEmbeddedDocuments;
  scene.createEmbeddedDocuments = async function(type, rows, options) {
    const result = await create.call(this, type, rows, options);
    if (!options?.keepId) throw new Error("Partial write failure");
    return result;
  };
  await assert.rejects(rebuild(scene, { placements: [placement] }, { level: 1 }), /rolled back/);
  assert.deepEqual(fingerprintScene(scene), before);
});

function element({ name, value = "", action, tab, panel = false, disabled = false } = {}) {
  const classes = new Set(panel ? ["tab"] : []);
  return {
    name, value, dataset: { ...(action ? { action } : {}), ...(tab ? { tab } : {}) }, disabled, listeners: {},
    classList: { contains: (key) => classes.has(key), toggle: (key, on) => on ? classes.add(key) : classes.delete(key) },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute(key, value) { this[key] = value; }
  };
}
function appFixture() {
  const controls = [
    element({ name: "selectedContent", value: "level-01" }),
    element({ name: "anchorArea", value: "1" }), element({ name: "rebuildArea", value: "2" }),
    element({ name: "preferredPacks", value: " world.creatures " }),
    element({ name: "override.creature", value: " Actor.new " }), element({ name: "override.clear", value: "" }),
    element({ action: "save-settings" }), element({ action: "populate", disabled: true })
  ];
  const tabs = ["review", "actors", "anchors", "actions"].flatMap((tab) => [
    element({ action: "select-tab", tab }), element({ tab, panel: true })
  ]);
  const form = element(); form.controls = controls;
  const app = new CyrenPopulatorApp();
  app.element = {
    querySelector(selector) {
      if (selector === "form.cyren-populator") return form;
      const name = selector.match(/^\[name="([^"]+)"\]$/)?.[1];
      const action = selector.match(/^\[data-action="([^"]+)"\]$/)?.[1];
      return controls.find((control) => name ? control.name === name : control.dataset.action === action);
    },
    querySelectorAll(selector) { return selector === "[data-tab]" ? tabs : [...controls, ...tabs.filter((entry) => !entry.classList.contains("tab"))]; }
  };
  return { app, controls, form, tabs };
}
const event = () => ({ preventDefault() {}, currentTarget: null });
const action = (name, extra = {}) => ({ dataset: { action: name, ...extra } });

await check("ApplicationV2 without legacy globals: tab persistence, selectors, native form save", async () => {
  assert.equal(globalThis.FormApplication, undefined);
  assert.equal(globalThis.$, undefined);
  assert.equal(globalThis.Dialog, undefined);
  const { app, controls, tabs } = appFixture();
  assert(app instanceof ApplicationV2);
  await app._onRender({}, {});
  await CyrenPopulatorApp.DEFAULT_OPTIONS.actions["select-tab"].call(app, event(), action("select-tab", { tab: "actions" }));
  assert.equal(app.selectedTab, "actions");
  assert(tabs.filter((tab) => tab.classList.contains("tab")).every((tab) => tab.hidden === (tab.dataset.tab !== "actions")));
  const rebuildSelector = controls.find((entry) => entry.name === "rebuildArea");
  rebuildSelector.value = "3";
  rebuildSelector.listeners.change({ currentTarget: rebuildSelector });
  assert.equal(app.selectedRebuildArea, "3");
  assert.equal(app._formValue('[name="anchorArea"]'), "1");
  settings.set(SETTINGS.actorOverrides, { otherLocation: "Actor.keep", clear: "Actor.old" });
  const nativeFormData = globalThis.FormData;
  globalThis.FormData = class {
    constructor(form) { this.entries = form.controls.filter((entry) => entry.name && !entry.disabled).map((entry) => [entry.name, entry.value]); }
    *[Symbol.iterator]() { yield* this.entries; }
  };
  try { await app._onAction(event(), action("save-settings")); }
  finally { globalThis.FormData = nativeFormData; }
  assert.deepEqual(settings.get(SETTINGS.actorOverrides), { otherLocation: "Actor.keep", creature: "Actor.new" });
  assert.equal(settings.get(SETTINGS.preferredPacks), "world.creatures");
  assert.equal(controls.find((entry) => entry.dataset.action === "populate").disabled, true);
  assert(controls.filter((entry) => entry.name).every((entry) => !entry.disabled));
  await app._onRender({}, {});
  assert.equal(app.selectedTab, "actions");
  assert.deepEqual((await openPopulator(2)).lastRender, { force: true });
});

await check("refresh and location-change locks remain held across asynchronous rendering", async () => {
  for (const changeLocation of [false, true]) {
    const { app, controls } = appFixture();
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    let renders = 0;
    app.render = async () => { renders++; await pending; };
    const operation = changeLocation
      ? app._onContentChange({ currentTarget: { value: "level-02" } })
      : app._onAction(event(), action("refresh"));
    await Promise.resolve();
    assert.equal(app._actionInFlight, true);
    await app._onAction(event(), action("refresh"));
    assert.equal(renders, 1);
    assert(controls.every((control) => control.disabled));
    release(); await operation;
    assert.equal(app._actionInFlight, false);
  }
});

const scene = makeScene();
let pan;
globalThis.canvas = { ready: true, scene, animatePan: async (point) => { pan = point; } };
const data = {
  level: 1, encounters: [1, 2].map((area) => ({ id: `area-${area}`, area: String(area), tokens: [{ actorKey: "creature", actor: "Creature", count: 1 }] }))
};
function context() {
  return { scene, data, plan: { placements: [placement] }, blocked: false,
    actors: new Map([["creature", { status: "resolved", document: actor }]]),
    anchors: new Map([["1", { status: "resolved", x: 200, y: 200 }], ["2", { status: "resolved", x: 700, y: 700 }]]) };
}

await check("delegated encounter target survives async context load and cleared currentTarget", async () => {
  const { app } = appFixture();
  app._buildContext = async () => context();
  await app._onAction(event(), action("pan-encounter", { encounterId: "area-2" }));
  assert.deepEqual(pan, { x: 700, y: 700, duration: 500 });
});

await check("DialogV2 cancellation is non-destructive; rebuild uses the independent area selector", async () => {
  const { app } = appFixture(); app.context = context();
  confirmation = null;
  await app._onAction(event(), action("rebuild-area"));
  assert.equal(scene.writes, 0);
  assert.equal(confirmations.at(-1).no.default, true);
  assert.equal(confirmations.at(-1).yes.default, false);
  assert.equal(confirmations.at(-1).rejectClose, false);
  confirmation = true;
  await app._onAction(event(), action("rebuild-area"));
  assert.equal(scene.tokens.length, 1);
  assert.equal(scene.tokens[0].flags[MODULE_ID].area, "2");
  assert.equal(scene.tokens[0].level, "native-level");
});

await check("legacy and modern PIXI preview paths; teardown settles pending anchor authoring", async () => {
  const handlers = new Map();
  globalThis.window = { addEventListener: (name, fn) => handlers.set(name, fn), removeEventListener: (name) => handlers.delete(name) };
  const stageHandlers = new Map();
  let preview;
  canvas.stage = {
    eventMode: "auto", addChild: (child) => { preview = child; },
    on: (name, fn) => stageHandlers.set(name, fn), off: (name) => stageHandlers.delete(name)
  };
  for (const modern of [false, true]) {
    const calls = [];
    class Graphics {}
    for (const name of modern ? ["rect", "fill", "stroke"] : ["lineStyle", "beginFill", "drawRect", "endFill"]) {
      Graphics.prototype[name] = function() { calls.push(name); return this; };
    }
    globalThis.PIXI = { Graphics, Container: class {
      addChild() {} destroy() { assert(!this.destroyed); this.destroyed = true; }
    } };
    const { app } = appFixture(); app.context = context();
    await app._onAction(event(), action("preview"));
    assert(calls.includes(modern ? "rect" : "drawRect"));
    clearPreview(); clearPreview();
    assert.equal(preview.destroyed, true);
  }
  const pending = authorAnchor(scene, "1");
  const rejected = assert.rejects(pending, /cancelled/);
  cancelAnchorAuthoring(); await rejected;
  assert.equal(handlers.size, 0); assert.equal(stageHandlers.size, 0);
  assert.equal(canvas.stage.eventMode, "auto");
});

await check("init/ready hooks register ApplicationV2 and retain the public API", async () => {
  const hooks = new Map();
  globalThis.Hooks = { once: (name, fn) => hooks.set(name, fn), on: (name, fn) => hooks.set(name, fn) };
  game.settings.register = () => {};
  game.settings.registerMenu = (_module, _name, config) => assert.equal(config.type, CyrenPopulatorApp);
  await import("../cyren-dotmm-populator/scripts/main.js");
  hooks.get("init")(); hooks.get("ready")(); hooks.get("canvasTearDown")();
  assert.equal(game.modules.get(MODULE_ID).api.open, openPopulator);
  const controls = { tokens: { tools: {} } };
  hooks.get("getSceneControlButtons")(controls);
  assert.equal(typeof controls.tokens.tools[`${MODULE_ID}-open`].onChange, "function");
});

await check("real location context, v14 idempotency, and safe configured Scene copying", async () => {
  const location = JSON.parse(fs.readFileSync(new URL("../cyren-dotmm-populator/data/yawning-portal.json", import.meta.url), "utf8"));
  const definition = location.scene;
  const source = makeScene();
  Object.assign(source, {
    name: definition.names[0], width: definition.width, height: definition.height,
    padding: definition.padding ?? 0, grid: { size: definition.grid },
    flags: { "scene-packer": { sourceId: definition.sourceId, "source-module": "cyrensmaps-wdmm" } },
    toObject: () => ({ _id: "copy", name: definition.names[0], active: true, navigation: true, levels: [{ _id: "native-level", name: "Ground" }] })
  });
  game.scenes = { contents: [source] };
  game.actors = [{ ...actor, name: location.encounters[0].tokens[0].actor, id: "durnan", uuid: "Actor.durnan" }];
  canvas.scene = source;
  const { app } = appFixture();
  app._selectedContentData = async () => location;
  const first = await app._prepareContext({});
  assert.equal(first.blocked, false);
  assert.equal(first.actorResolved, 1);
  assert.equal(first.anchorResolved, 1);
  assert.equal(first.planCount, 1);
  await populateMissing(source, first.plan);
  assert.equal((await app._prepareContext({})).planCount, 0);
  source.levels.push({ id: "extra" });
  const blocked = await app._prepareContext({});
  assert.equal(blocked.blocked, true);
  assert(blocked.environmentErrors.some((message) => message.includes("exactly one Scene Level")));
  source.levels.pop();

  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => structuredClone(location) });
  const sourceBefore = source.toObject();
  let createdData;
  CONFIG.Scene = { documentClass: { async create(data) { createdData = data; return data; } } };
  try {
    const copies = await createMissingSafetyCopies({ contentIds: ["yawning-portal"] });
    assert.equal(copies.created.length, 1);
  } finally { globalThis.fetch = nativeFetch; }
  assert.equal(createdData.active, false);
  assert.equal(createdData.navigation, false);
  assert.equal(createdData._id, undefined);
  assert.deepEqual(createdData.levels, sourceBefore.levels);
  assert.deepEqual(source.toObject(), sourceBefore);
});

console.log(JSON.stringify({ ok: true, kind: "mocked API contracts (not live Foundry)", checks: completed }, null, 2));
