#!/usr/bin/env node

/**
 * Build the distributable skill bundle archives.
 *
 * Produces two byte-identical zips of skills/prompt-architect/ in the repo root:
 *
 *   prompt-architect.zip    ChatGPT and anything following the Agent Skills
 *                           spec's upload path. ChatGPT's uploader expects a
 *                           .zip containing exactly one top-level folder; an
 *                           unrecognized .skill extension can be filtered out
 *                           by the file picker.
 *   prompt-architect.skill  Gemini CLI and other tools that expect the .skill
 *                           extension. Same archive, different name.
 *
 * Usage:
 *   node scripts/build-skill.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'prompt-architect');
const ZIP_FILE = path.join(__dirname, '..', 'prompt-architect.zip');
const SKILL_FILE = path.join(__dirname, '..', 'prompt-architect.skill');

if (!fs.existsSync(SKILL_DIR)) {
  console.error('Error: skills/prompt-architect/ not found');
  process.exit(1);
}

// Remove old artifacts if present — zip appends to an existing archive.
for (const file of [ZIP_FILE, SKILL_FILE]) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

// Build the .zip first, then copy it to .skill so both are the same bytes.
// Zipping from skills/ keeps prompt-architect/ as the single top-level folder,
// which the Agent Skills upload spec requires.
try {
  const skillsRoot = path.join(__dirname, '..', 'skills');

  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${SKILL_DIR}' -DestinationPath '${ZIP_FILE}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(
      `cd "${skillsRoot}" && zip -r "${ZIP_FILE}" prompt-architect/`,
      { stdio: 'inherit' }
    );
  }

  fs.copyFileSync(ZIP_FILE, SKILL_FILE);

  const sizeKB = (fs.statSync(ZIP_FILE).size / 1024).toFixed(1);
  console.log(`\n  Built: prompt-architect.zip (${sizeKB} KB)`);
  console.log(`  Built: prompt-architect.skill (${sizeKB} KB, same archive)\n`);
  console.log('  Upload:');
  console.log('    - ChatGPT: Profile → Skills → New skill → Upload from your');
  console.log('      computer → prompt-architect.zip');
  console.log('    - Gemini CLI: gemini skills install ./prompt-architect.skill');
  console.log('    - Any Agent Skills compatible tool\n');

} catch (err) {
  console.error(`Build failed: ${err.message}`);
  process.exit(1);
}
