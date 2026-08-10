import { ClassicLevel } from "classic-level";

const [databasePath = ".discovery-temp/cyren/maps"] = process.argv.slice(2);
const db = new ClassicLevel(databasePath, {
  createIfMissing: false,
  keyEncoding: "utf8",
  valueEncoding: "utf8"
});

function areaFromTile(tile) {
  const source = decodeURIComponent(String(tile.texture?.src ?? tile.img ?? ""));
  return source.match(/number tokens\/[^/]*?([0-9]+[a-z]?)(?:\.[a-z0-9]+)?$/i)?.[1]?.toLowerCase() ?? null;
}

try {
  await db.open();
  const scenes = new Map();
  const embeddedTiles = new Map();

  for await (const [key, raw] of db.iterator()) {
    const value = JSON.parse(raw);
    const sceneMatch = key.match(/^!scenes!([^.]+)$/);
    if (sceneMatch && /^Level\s+\d+/i.test(value?.name ?? "")) {
      scenes.set(sceneMatch[1], value);
      continue;
    }
    const tileMatch = key.match(/^!scenes\.tiles!([^.]+)\./);
    if (tileMatch) {
      if (!embeddedTiles.has(tileMatch[1])) embeddedTiles.set(tileMatch[1], []);
      embeddedTiles.get(tileMatch[1]).push(value);
    }
  }

  const inventory = [];
  for (const [id, scene] of scenes) {
    const tiles = Array.from(new Map(
      [...(scene.tiles ?? []), ...(embeddedTiles.get(id) ?? [])]
        .map((tile) => [tile._id ?? tile.id, tile])
    ).values());
    const anchors = tiles
      .map((tile) => ({
        area: areaFromTile(tile),
        x: Number(tile.x) + Number(tile.width) / 2,
        y: Number(tile.y) + Number(tile.height) / 2
      }))
      .filter((anchor) => anchor.area)
      .sort((left, right) => left.area.localeCompare(right.area, undefined, { numeric: true }));
    const duplicates = [...new Set(anchors
      .filter((anchor, index) => anchors.findIndex((other) => other.area === anchor.area) !== index)
      .map((anchor) => anchor.area))];
    inventory.push({
      id,
      name: scene.name,
      sourceId: scene.flags?.["scene-packer"]?.sourceId ?? null,
      width: scene.width,
      height: scene.height,
      padding: scene.padding ?? null,
      background: scene.background ?? null,
      grid: scene.grid?.size ?? scene.grid,
      anchors,
      duplicateAnchors: duplicates
    });
  }

  inventory.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  console.log(JSON.stringify(inventory, null, 2));
} finally {
  await db.close();
}
