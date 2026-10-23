#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const packageJsonPath = path.join(rootDir, "package.json");
const packageLockJsonPath = path.join(rootDir, "package-lock.json");
const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");
const cargoLockPath = path.join(rootDir, "src-tauri", "Cargo.lock");

function parseSemver(v) {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

function bumpVersion(current, type) {
  const parsed = parseSemver(current);
  if (!parsed) {
    throw new Error(`Current version "${current}" is not valid semver.`);
  }

  switch (type.toLowerCase()) {
    case "patch":
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case "minor":
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case "major":
      return `${parsed.major + 1}.0.0`;
    default:
      return null;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function main() {
  const pkg = readJson(packageJsonPath);
  const currentVersion = pkg.version;
  const input = process.argv[2];

  if (!input) {
    console.log(`Current version: ${currentVersion}`);
    console.log(`\nUsage:`);
    console.log(`  node scripts/set-version.mjs <new-version | patch | minor | major>`);
    console.log(`  npm run set-version -- <new-version | patch | minor | major>`);
    console.log(`\nExamples:`);
    console.log(`  npm run set-version -- patch     # ${currentVersion} -> ${bumpVersion(currentVersion, "patch")}`);
    console.log(`  npm run set-version -- minor     # ${currentVersion} -> ${bumpVersion(currentVersion, "minor")}`);
    console.log(`  npm run set-version -- major     # ${currentVersion} -> ${bumpVersion(currentVersion, "major")}`);
    console.log(`  npm run set-version -- 0.2.0     # Explicit version`);
    process.exit(1);
  }

  let newVersion = bumpVersion(currentVersion, input);
  if (!newVersion) {
    // Treat as explicit version string (allow optional leading 'v')
    const cleaned = input.startsWith("v") ? input.slice(1) : input;
    if (!parseSemver(cleaned)) {
      console.error(`Error: "${input}" is not a valid semver version or bump type (patch, minor, major).`);
      process.exit(1);
    }
    newVersion = cleaned;
  }

  if (newVersion === currentVersion) {
    console.log(`Version is already ${currentVersion}. Nothing to update.`);
    return;
  }

  console.log(`Updating version: ${currentVersion} -> ${newVersion}\n`);

  // 1. package.json
  pkg.version = newVersion;
  writeJson(packageJsonPath, pkg);
  console.log(`✓ Updated package.json`);

  // 2. package-lock.json
  if (fs.existsSync(packageLockJsonPath)) {
    const pkgLock = readJson(packageLockJsonPath);
    pkgLock.version = newVersion;
    if (pkgLock.packages && pkgLock.packages[""]) {
      pkgLock.packages[""].version = newVersion;
    }
    writeJson(packageLockJsonPath, pkgLock);
    console.log(`✓ Updated package-lock.json`);
  }

  // 3. src-tauri/tauri.conf.json
  if (fs.existsSync(tauriConfPath)) {
    const tauriConf = readJson(tauriConfPath);
    tauriConf.version = newVersion;
    writeJson(tauriConfPath, tauriConf);
    console.log(`✓ Updated src-tauri/tauri.conf.json`);
  }

  // 4. src-tauri/Cargo.toml
  if (fs.existsSync(cargoTomlPath)) {
    const cargoToml = fs.readFileSync(cargoTomlPath, "utf-8");
    const updatedToml = cargoToml.replace(
      /^(\s*\[package\][\s\S]*?^\s*version\s*=\s*")[^"]*(")/m,
      `$1${newVersion}$2`
    );
    if (updatedToml !== cargoToml) {
      fs.writeFileSync(cargoTomlPath, updatedToml, "utf-8");
      console.log(`✓ Updated src-tauri/Cargo.toml`);
    } else {
      console.warn(`! Could not find [package] version in src-tauri/Cargo.toml`);
    }
  }

  // 5. src-tauri/Cargo.lock
  if (fs.existsSync(cargoLockPath)) {
    const cargoLock = fs.readFileSync(cargoLockPath, "utf-8");
    const updatedLock = cargoLock.replace(
      /(\[\[package\]\]\r?\nname\s*=\s*"dbvolio"\r?\nversion\s*=\s*")[^"]*(")/,
      `$1${newVersion}$2`
    );
    if (updatedLock !== cargoLock) {
      fs.writeFileSync(cargoLockPath, updatedLock, "utf-8");
      console.log(`✓ Updated src-tauri/Cargo.lock`);
    }
  }

  console.log(`\nSuccessfully bumped version to ${newVersion}!`);
}

main();
