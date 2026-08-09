import fs from "node:fs";
import { ClassicLevel } from "classic-level";

const [databasePath = ".discovery-temp/actors", levelPath = "cyren-dotmm-populator/data/level-01.json"] = process.argv.slice(2);
const level = JSON.parse(fs.readFileSync(levelPath, "utf8"));
const normalize = (value) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sourceOf = (actor) => actor.flags?.plutonium?.source ?? actor.flags?.["5etools"]?.source ?? actor.system?.source?.book ?? actor._stats?.compendiumSource ?? null;

const db = new ClassicLevel(databasePath, { createIfMissing: false, keyEncoding: "utf8", valueEncoding: "utf8" });
const actors = [];
try {
  await db.open();
  for await (const [key, raw] of db.iterator()) {
    if (!/^!actors![^.]+$/.test(key)) continue;
    const actor = JSON.parse(raw);
    if (actor?.name) actors.push(actor);
  }
} finally {
  await db.close();
}

const specs = new Map();
for (const encounter of level.encounters) for (const token of encounter.tokens) {
  if (!specs.has(token.actorKey)) specs.set(token.actorKey, token);
}

const rows = [];
for (const spec of specs.values()) {
  let matchedName = spec.actor;
  let matches = actors.filter((actor) => normalize(actor.name) === normalize(spec.actor));
  if (!matches.length) {
    for (const alias of spec.aliases ?? []) {
      matches = actors.filter((actor) => normalize(actor.name) === normalize(alias));
      if (matches.length) { matchedName = alias; break; }
    }
  }
  rows.push({
    actorKey: spec.actorKey,
    requested: spec.actor,
    matchedName,
    count: matches.length,
    candidates: matches.map((actor) => ({ id: actor._id, name: actor.name, source: sourceOf(actor) }))
  });
}
console.log(JSON.stringify({ worldActorCount: actors.length, rows }, null, 2));
