import { ClassicLevel } from "classic-level";

const [databasePath, sceneId] = process.argv.slice(2);
if (!databasePath || !sceneId) {
  console.error("Usage: node tools/inspect-scene-anchors.mjs <database-path> <scene-id>");
  process.exitCode = 2;
} else {
  const db = new ClassicLevel(databasePath, {
    createIfMissing: false,
    keyEncoding: "utf8",
    valueEncoding: "utf8"
  });

  try {
    await db.open();
    let scene = null;
    const embeddedTiles = [];
    for await (const [key, rawValue] of db.iterator()) {
      if (key !== `!scenes!${sceneId}` && !key.startsWith(`!scenes.tiles!${sceneId}.`)) continue;
      const value = JSON.parse(rawValue);
      if (key === `!scenes!${sceneId}`) scene = value;
      else embeddedTiles.push(value);
    }

    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const tiles = Array.from(new Map(
      [...(scene.tiles ?? []), ...embeddedTiles].map((tile) => [tile._id ?? tile.id, tile])
    ).values());
    const anchors = [];
    const unmatchedNumberSources = new Set();
    for (const tile of tiles) {
      const source = tile.texture?.src ?? tile.img ?? "";
      const decodedSource = decodeURIComponent(String(source));
      const match = decodedSource.match(/number tokens\/([^/]*?)([0-9]+[a-z]?)(?:\.[a-z0-9]+)?$/i);
      if (!match) {
        if (/number/i.test(decodedSource)) unmatchedNumberSources.add(decodedSource);
        continue;
      }
      anchors.push({
        area: match[2].toLowerCase(),
        x: Number(tile.x) + Number(tile.width) / 2,
        y: Number(tile.y) + Number(tile.height) / 2,
        tileId: tile._id ?? tile.id ?? null,
        source,
        active: tile.flags?.["monks-active-tiles"]?.active ?? null,
        actionCount: tile.flags?.["monks-active-tiles"]?.actions?.length ?? 0
      });
    }

    anchors.sort((left, right) => left.area.localeCompare(right.area, undefined, { numeric: true }));
    console.log(JSON.stringify({
      scene: {
        id: scene._id,
        name: scene.name,
        width: scene.width,
        height: scene.height,
        grid: scene.grid?.size ?? scene.grid,
        sourceId: scene.flags?.["scene-packer"]?.sourceId ?? null,
        sourceModule: scene.flags?.["scene-packer"]?.["source-module"] ?? scene.flags?.["scene-packer"]?.sourceModule ?? null,
        tiles: tiles.length
      },
      anchors,
      unmatchedNumberSources: [...unmatchedNumberSources].sort()
    }, null, 2));
  } finally {
    await db.close();
  }
}
