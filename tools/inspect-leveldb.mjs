import { ClassicLevel } from "classic-level";

const [databasePath, mode = "summary"] = process.argv.slice(2);

if (!databasePath) {
  console.error("Usage: node tools/inspect-leveldb.mjs <database-path> [summary|json]");
  process.exitCode = 2;
} else {
  const db = new ClassicLevel(databasePath, {
    createIfMissing: false,
    keyEncoding: "utf8",
    valueEncoding: "utf8"
  });

  try {
    await db.open();
    const rows = [];
    for await (const [key, rawValue] of db.iterator()) {
      let value;
      try {
        value = JSON.parse(rawValue);
      } catch {
        value = rawValue;
      }

      if (mode === "settings") {
        const settingKey = value?.key ?? "";
        if (
          settingKey === "core.moduleConfiguration"
          || settingKey.startsWith("cyrensmaps-wdmm.")
          || settingKey.startsWith("scene-packer.")
          || settingKey.startsWith("monks-active-tiles.")
        ) {
          rows.push({ key: settingKey, value: value?.value ?? null });
        }
        continue;
      }

      if (mode.startsWith("scene:")) {
        const sceneId = mode.slice("scene:".length);
        if (key === `!scenes!${sceneId}`) {
          rows.push({
            scene: {
              id: value?._id,
              name: value?.name,
              width: value?.width,
              height: value?.height,
              grid: value?.grid?.size ?? value?.grid,
              walls: value?.walls?.length ?? 0,
              lights: value?.lights?.length ?? 0,
              tiles: value?.tiles?.length ?? 0,
              notes: value?.notes?.length ?? 0,
              sounds: value?.sounds?.length ?? 0,
              drawings: value?.drawings?.length ?? 0,
              regions: value?.regions?.length ?? 0,
              tokens: value?.tokens?.length ?? 0,
              scenePacker: value?.flags?.["scene-packer"] ?? null,
              cyren: value?.flags?.["cyrensmaps-wdmm"] ?? null
            }
          });
        } else if (key.startsWith(`!scenes.tokens!${sceneId}.`)) {
          rows.push({
            token: {
              id: value?._id,
              name: value?.name,
              actorId: value?.actorId,
              actorLink: value?.actorLink,
              x: value?.x,
              y: value?.y,
              width: value?.width,
              height: value?.height,
              disposition: value?.disposition,
              hidden: value?.hidden,
              flagScopes: value?.flags && typeof value.flags === "object"
                ? Object.keys(value.flags)
                : []
            }
          });
        }
        continue;
      }

      if (mode === "actors") {
        if (/^![^.]+![^.]+$/.test(key) && value?.name && value?.prototypeToken) {
          rows.push({
            key,
            id: value?._id ?? value?.id ?? null,
            name: value.name,
            type: value.type ?? null
          });
        }
        continue;
      }

      if (mode === "json") {
        rows.push({ key, value });
        continue;
      }

      if (!/^!scenes![^.]+$/.test(key)) continue;

      rows.push({
        key,
        id: value?._id ?? value?.id ?? null,
        name: value?.name ?? value?.title ?? null,
        type: value?.documentName ?? value?.type ?? null,
        width: value?.width ?? value?.dimensions?.sceneWidth ?? null,
        height: value?.height ?? value?.dimensions?.sceneHeight ?? null,
        grid: value?.grid?.size ?? value?.grid ?? null,
        tokens: Array.isArray(value?.tokens) ? value.tokens.length : null,
        walls: Array.isArray(value?.walls) ? value.walls.length : null,
        lights: Array.isArray(value?.lights) ? value.lights.length : null,
        tiles: Array.isArray(value?.tiles) ? value.tiles.length : null,
        notes: Array.isArray(value?.notes) ? value.notes.length : null,
        sounds: Array.isArray(value?.sounds) ? value.sounds.length : null,
        drawings: Array.isArray(value?.drawings) ? value.drawings.length : null,
        regions: Array.isArray(value?.regions) ? value.regions.length : null,
        flagScopes: value?.flags && typeof value.flags === "object"
          ? Object.keys(value.flags)
          : []
      });
    }
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await db.close();
  }
}
