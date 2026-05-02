const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const filesToCopy = [
  "manifest.json",
  "README.md",
  "icons/icon-128.svg",
  "src/shared/constants.js",
  "src/shared/storage.js",
  "src/shared/utils.js",
  "src/shared/selectors.js",
  "src/content/ui.js",
  "src/content/autosave.js",
  "src/content/navigation.js",
  "src/content/pdf_viewer.js",
  "src/content/command_palette.js",
  "src/content/main.js",
  "src/background/service_worker.js",
  "src/popup/popup.html",
  "src/popup/popup.css",
  "src/popup/popup.js"
];

function assertInsideRoot(targetPath) {
  const relative = path.relative(rootDir, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project: ${targetPath}`);
  }
}

function copyFile(relativePath) {
  const source = path.join(rootDir, relativePath);
  const destination = path.join(distDir, relativePath);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing source file: ${relativePath}`);
  }

  assertInsideRoot(destination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function validateManifest() {
  const manifestPath = path.join(rootDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const contentScripts = manifest.content_scripts?.flatMap((script) => script.js || []) || [];
  const referencedFiles = [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    ...contentScripts
  ].filter(Boolean);

  referencedFiles.forEach((relativePath) => {
    if (!filesToCopy.includes(relativePath)) {
      throw new Error(`Manifest references a file not copied to dist: ${relativePath}`);
    }
  });

  return manifest;
}

function validateJavaScript() {
  const jsFiles = filesToCopy.filter((file) => file.endsWith(".js"));
  jsFiles.forEach((relativePath) => {
    const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
    new Function(source);
  });
}

function build() {
  validateManifest();
  validateJavaScript();

  fs.mkdirSync(distDir, { recursive: true });
  filesToCopy.forEach(copyFile);

  console.log(`Built unpacked extension at ${distDir}`);
}

build();
