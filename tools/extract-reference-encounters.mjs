import { readFile } from "node:fs/promises";

const [sourcePath, sectionPattern = "^Level 1:"] = process.argv.slice(2);

if (!sourcePath) {
  console.error("Usage: node tools/extract-reference-encounters.mjs <adventure-json> [section-regex]");
  process.exitCode = 2;
} else {
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const matcher = new RegExp(sectionPattern, "i");

  function findSection(value) {
    if (!value || typeof value !== "object") return null;
    if (typeof value.name === "string" && matcher.test(value.name)) return value;
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      const found = findSection(child);
      if (found) return found;
    }
    return null;
  }

  const section = findSection(source);
  if (!section) throw new Error(`Section not found: ${sectionPattern}`);

  const records = [];
  function walk(value, path = [section.name]) {
    if (typeof value === "string") {
      const creatures = [...value.matchAll(/\{@creature ([^}|]+)(?:\|[^}]*)?}/gi)]
        .map((match) => match[1]);
      if (creatures.length) records.push({ path: path.join(" > "), creatures, reference: value });
      return;
    }
    if (!value || typeof value !== "object") return;

    const nextPath = typeof value.name === "string" && value !== section
      ? [...path, value.name]
      : path;
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      walk(child, nextPath);
    }
  }

  walk(section);
  console.log(JSON.stringify({ section: section.name, records }, null, 2));
}
