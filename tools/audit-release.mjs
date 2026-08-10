import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve();
const moduleRoot = path.join(root, "cyren-dotmm-populator");
const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(moduleRoot, "module.json"), "utf8"));
const constants = fs.readFileSync(path.join(moduleRoot, "scripts", "constants.js"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "release.yml"), "utf8");
const errors = [];

function listFiles(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(absolute, relative) : [relative.replaceAll("\\", "/")];
    });
}

function zipEntries(buffer) {
  const entries = [];
  for (let offset = 0; offset <= buffer.length - 46;) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.push({
      name: buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
      externalAttributes: buffer.readUInt32LE(offset + 38)
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function validateMarkdownLinks(file) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!target || /^(?:https?:|mailto:)/i.test(target)) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      errors.push(`Malformed link encoding in ${path.relative(root, file)}: ${target}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) errors.push(`Broken local link in ${path.relative(root, file)}: ${target}`);
  }
}

if (manifest.version !== packageMetadata.version) errors.push("package.json and module.json versions differ.");
if (JSON.stringify(manifest.languages?.map((entry) => entry.lang)) !== JSON.stringify(["en"])) {
  errors.push("The release module must expose English localization only.");
}
if (fs.existsSync(path.join(moduleRoot, "lang", "pt-BR.json"))) errors.push("Obsolete Portuguese localization is still packaged.");
const constantVersion = constants.match(/MODULE_VERSION\s*=\s*"([^"]+)"/)?.[1];
if (constantVersion !== manifest.version) errors.push("MODULE_VERSION and module.json versions differ.");

const expectedArchiveName = `${manifest.id}-${manifest.version}.zip`;
const expectedDownload = `https://github.com/sierrific/sier-s-dotmm-populator-for-cyren-s-maps/releases/download/v${manifest.version}/${expectedArchiveName}`;
if (manifest.download !== expectedDownload) errors.push("Manifest download URL does not match the current version.");

const archivePath = path.join(root, "dist", expectedArchiveName);
const checksumPath = `${archivePath}.sha256`;
if (!fs.existsSync(archivePath)) errors.push(`Missing built archive: dist/${expectedArchiveName}`);
if (!fs.existsSync(checksumPath)) errors.push(`Missing checksum: dist/${expectedArchiveName}.sha256`);

if (fs.existsSync(archivePath)) {
  const archive = fs.readFileSync(archivePath);
  const expectedFiles = listFiles(moduleRoot);
  const archiveEntries = zipEntries(archive).sort((left, right) => left.name.localeCompare(right.name));
  const actualFiles = archiveEntries.map((entry) => entry.name);
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) errors.push("ZIP contents differ from the module source tree.");
  if (actualFiles.some((entry) => path.posix.isAbsolute(entry) || entry.split("/").includes(".."))) errors.push("ZIP contains an unsafe path.");
  if (!actualFiles.includes("module.json")) errors.push("ZIP does not contain module.json at its root.");
  if (archiveEntries.some((entry) => ((entry.externalAttributes >>> 16) & 0xffff) !== 0o100644)) {
    errors.push("ZIP file permissions are not portable Unix 0644 entries.");
  }

  if (fs.existsSync(checksumPath)) {
    const actualHash = crypto.createHash("sha256").update(archive).digest("hex");
    const recordedHash = fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/, 1)[0];
    if (actualHash !== recordedHash) errors.push("ZIP checksum file does not match the archive.");
  }
}

for (const requiredAsset of [
  "dist/cyren-dotmm-populator-*.zip",
  "dist/cyren-dotmm-populator-*.zip.sha256",
  "installer/install.ps1",
  "installer/install.sh"
]) {
  if (!workflow.includes(requiredAsset)) errors.push(`Release workflow omits ${requiredAsset}.`);
}

for (const file of [
  path.join(root, "README.md"),
  path.join(root, "CHANGELOG.md"),
  path.join(root, "docs", "INSTALLATION.md"),
  path.join(root, "docs", "LEVEL-02.md"),
  path.join(root, "docs", "LEVELS-03-23.md"),
  path.join(root, "docs", "TECHNICAL.md"),
  path.join(root, "docs", "USER-GUIDE.md"),
  path.join(root, "docs", "VALIDATION.md"),
  path.join(root, "THIRD_PARTY_NOTICES.md"),
  path.join(moduleRoot, "THIRD_PARTY_NOTICES.md"),
  path.join(moduleRoot, "README.md")
]) validateMarkdownLinks(file);

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
if (!readme.includes("Levels 1–23")) errors.push("README does not state the supported Levels 1–23 scope.");
if (!readme.includes(expectedArchiveName)) errors.push("README does not name the current installer ZIP.");
if (!readme.includes(manifest.manifest)) errors.push("README does not contain the current manifest URL.");

for (const installer of ["install.ps1", "install.sh"]) {
  const source = fs.readFileSync(path.join(root, "installer", installer), "utf8");
  if (!source.includes(manifest.id)) errors.push(`${installer} does not target the module id.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    version: manifest.version,
    archive: `dist/${expectedArchiveName}`,
    files: listFiles(moduleRoot).length,
    documentationLinks: "valid",
    checksum: "valid",
    unixPermissions: "0644"
  }, null, 2));
}
