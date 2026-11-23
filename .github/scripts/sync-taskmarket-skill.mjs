#!/usr/bin/env node

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillsDir = path.join(repositoryRoot, 'plugins/taskmarket/skills');
const pluginJsonPath = path.join(repositoryRoot, 'plugins/taskmarket/.claude-plugin/plugin.json');
const marketplaceJsonPath = path.join(repositoryRoot, '.claude-plugin/marketplace.json');

const baseUrl = (process.env.TASKMARKET_SKILL_BASE_URL || 'https://taskmarket.dev').replace(
  /\/+$/,
  ''
);
const args = new Set(process.argv.slice(2));
const applyChanges = args.has('--apply');
const checkOnly = args.has('--check') || !applyChanges;

const ALLOWED_FILE_PATTERN = /^(modes|reference|examples)\/[A-Za-z0-9._-]+\.(md|json)$/;
const MIN_MANIFEST_FILES = 5;
const FETCH_CONCURRENCY = 6;

function validateManifestPath(relativeFile) {
  if (
    !relativeFile ||
    relativeFile.startsWith('/') ||
    relativeFile.includes('..') ||
    relativeFile.includes('\\')
  ) {
    throw new Error(`Invalid path in skill manifest: ${relativeFile}`);
  }
  if (relativeFile === 'skill.md') return 'SKILL.md';
  if (ALLOWED_FILE_PATTERN.test(relativeFile)) return relativeFile;
  throw new Error(`Unsupported path in skill manifest: ${relativeFile}`);
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'daydreamsai-skills-market-sync/1.0' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function fetchManifest() {
  const manifestUrl = `${baseUrl}/reference/skill-manifest.txt`;
  const raw = (await fetchBuffer(manifestUrl)).toString('utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < MIN_MANIFEST_FILES) {
    throw new Error(
      `Skill manifest at ${manifestUrl} has only ${lines.length} entries (expected >= ${MIN_MANIFEST_FILES})`
    );
  }

  let rootCount = 0;
  const entries = [];
  const seenTargets = new Set();

  for (const sourcePath of lines) {
    const targetPath = validateManifestPath(sourcePath);
    if (sourcePath === 'skill.md') rootCount += 1;
    if (seenTargets.has(targetPath)) {
      throw new Error(`Duplicate target path in skill manifest: ${targetPath}`);
    }
    seenTargets.add(targetPath);
    entries.push({ sourcePath, targetPath });
  }

  if (rootCount !== 1) {
    throw new Error(`Expected exactly one skill.md entry in manifest, found ${rootCount}`);
  }

  return entries;
}

async function fetchAllFiles(entries) {
  const results = new Map();
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const current = entries[index];
      index += 1;
      const content = await fetchBuffer(`${baseUrl}/${current.sourcePath}`);
      if (current.sourcePath === 'skill.md') {
        const text = content.toString('utf8');
        if (!text.startsWith('---\n')) {
          throw new Error('Fetched skill.md does not start with YAML frontmatter');
        }
        const rewritten = text.replace(/^name: taskmarket-operator$/m, 'name: taskmarket');
        if (rewritten === text) {
          throw new Error('Fetched skill.md frontmatter no longer declares name: taskmarket-operator');
        }
        results.set(current.targetPath, Buffer.from(rewritten, 'utf8'));
      } else {
        results.set(current.targetPath, content);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, entries.length) }, () => worker())
  );

  return results;
}

function listFilesRecursive(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const fullPath = path.join(dir, name);
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (statSync(fullPath).isDirectory()) {
      out.push(...listFilesRecursive(fullPath, relPath));
    } else {
      out.push(relPath);
    }
  }
  return out;
}

function extractSkillVersion(skillMdBuffer) {
  const text = skillMdBuffer.toString('utf8');
  const match = text.match(/^version:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*$/m);
  if (!match) {
    throw new Error('Fetched SKILL.md is missing a YYYY-MM-DD version header');
  }
  return match[1];
}

function bumpPatch(semver) {
  const match = String(semver).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Expected semver x.y.z, got: ${semver}`);
  }
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function writeGitHubOutputs(values) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  appendFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function replaceSkillsDirectory(fetchedFiles) {
  rmSync(skillsDir, { force: true, recursive: true });
  mkdirSync(skillsDir, { recursive: true });

  for (const [relativePath, content] of fetchedFiles.entries()) {
    const fullPath = path.join(skillsDir, relativePath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

function bumpManifestVersions() {
  const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
  const marketplaceJson = JSON.parse(readFileSync(marketplaceJsonPath, 'utf8'));
  const marketplacePlugin = marketplaceJson.plugins?.find((p) => p.name === 'taskmarket');
  if (!marketplacePlugin) {
    throw new Error('taskmarket entry missing from .claude-plugin/marketplace.json');
  }

  const nextPluginVersion = bumpPatch(pluginJson.version);
  const nextMarketplaceVersion = bumpPatch(marketplaceJson.metadata.version);

  pluginJson.version = nextPluginVersion;
  marketplacePlugin.version = nextPluginVersion;
  marketplaceJson.metadata.version = nextMarketplaceVersion;

  writeFileSync(pluginJsonPath, `${JSON.stringify(pluginJson, null, 2)}\n`, 'utf8');
  writeFileSync(marketplaceJsonPath, `${JSON.stringify(marketplaceJson, null, 2)}\n`, 'utf8');

  return { nextPluginVersion, nextMarketplaceVersion };
}

async function main() {
  const entries = await fetchManifest();
  const fetchedFiles = await fetchAllFiles(entries);
  const skillVersion = extractSkillVersion(fetchedFiles.get('SKILL.md'));

  const existingFiles = new Set(listFilesRecursive(skillsDir));
  const added = [];
  const modified = [];
  const removed = [];

  for (const [relativePath, content] of fetchedFiles.entries()) {
    if (!existingFiles.has(relativePath)) {
      added.push(relativePath);
    } else {
      const current = readFileSync(path.join(skillsDir, relativePath));
      if (!current.equals(content)) {
        modified.push(relativePath);
      }
    }
  }

  for (const existingPath of existingFiles) {
    if (!fetchedFiles.has(existingPath)) {
      removed.push(existingPath);
    }
  }

  added.sort();
  modified.sort();
  removed.sort();

  const changed = added.length > 0 || modified.length > 0 || removed.length > 0;
  if (!changed) {
    console.log(
      `No drift detected against ${baseUrl} (version ${skillVersion}, ${fetchedFiles.size} files).`
    );
    writeGitHubOutputs({
      changed: 'false',
      skill_version: skillVersion,
      added_count: 0,
      modified_count: 0,
      removed_count: 0,
    });
    return;
  }

  console.log(
    `Drift detected against ${baseUrl} (version ${skillVersion}): +${added.length} added, ~${modified.length} modified, -${removed.length} removed.`
  );
  for (const f of added) console.log(`  A ${f}`);
  for (const f of modified) console.log(`  M ${f}`);
  for (const f of removed) console.log(`  D ${f}`);

  if (checkOnly) {
    writeGitHubOutputs({
      changed: 'true',
      skill_version: skillVersion,
      added_count: added.length,
      modified_count: modified.length,
      removed_count: removed.length,
    });
    process.exitCode = 1;
    return;
  }

  replaceSkillsDirectory(fetchedFiles);
  const { nextPluginVersion, nextMarketplaceVersion } = bumpManifestVersions();

  console.log(
    `Applied sync: plugin version ${nextPluginVersion}, marketplace version ${nextMarketplaceVersion}.`
  );
  writeGitHubOutputs({
    changed: 'true',
    skill_version: skillVersion,
    plugin_version: nextPluginVersion,
    marketplace_version: nextMarketplaceVersion,
    added_count: added.length,
    modified_count: modified.length,
    removed_count: removed.length,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
