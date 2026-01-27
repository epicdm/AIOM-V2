#!/usr/bin/env node

/**
 * Skill Validation Script
 *
 * Validates the structure and content of a skill to ensure it follows best practices.
 *
 * Usage:
 *   node scripts/validate-skill.js <skill-path>
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Skill Validation Script

Usage:
  node scripts/validate-skill.js <skill-path>

Examples:
  node scripts/validate-skill.js skills/my-skill
  node scripts/validate-skill.js skills/skill-creator

This will validate:
  - SKILL.md exists and has proper frontmatter
  - Frontmatter has required fields (name, description)
  - Description is comprehensive (includes "when to use")
  - Directory structure is correct
  - No prohibited files (README.md, etc.)
  - File references in SKILL.md actually exist
`);
  process.exit(0);
}

const skillPath = path.resolve(args[0]);
const skillName = path.basename(skillPath);

let errorCount = 0;
let warningCount = 0;

function error(message) {
  console.error(`❌ ERROR: ${message}`);
  errorCount++;
}

function warning(message) {
  console.warn(`⚠️  WARNING: ${message}`);
  warningCount++;
}

function success(message) {
  console.log(`✅ ${message}`);
}

console.log(`\n🔍 Validating skill: ${skillName}`);
console.log(`📁 Path: ${skillPath}\n`);

// Check if skill directory exists
if (!fs.existsSync(skillPath)) {
  error(`Skill directory not found: ${skillPath}`);
  process.exit(1);
}

if (!fs.statSync(skillPath).isDirectory()) {
  error(`Not a directory: ${skillPath}`);
  process.exit(1);
}

// Check for SKILL.md
const skillMdPath = path.join(skillPath, 'SKILL.md');
if (!fs.existsSync(skillMdPath)) {
  error('SKILL.md not found (required)');
  process.exit(1);
}
success('SKILL.md exists');

// Read SKILL.md content
const skillContent = fs.readFileSync(skillMdPath, 'utf-8');

// Check for YAML frontmatter
const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
const frontmatterMatch = skillContent.match(frontmatterRegex);

if (!frontmatterMatch) {
  error('SKILL.md missing YAML frontmatter');
} else {
  success('YAML frontmatter found');

  const frontmatter = frontmatterMatch[1];

  // Parse frontmatter fields
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  // Validate name field
  if (!nameMatch) {
    error('Frontmatter missing required field: name');
  } else {
    const name = nameMatch[1].trim();
    success(`name: ${name}`);

    // Check name matches directory
    if (name !== skillName) {
      warning(`Skill name '${name}' doesn't match directory name '${skillName}'`);
    }

    // Check name format
    if (!/^[a-z0-9-]+$/.test(name)) {
      error(`Skill name must be lowercase with hyphens only (got: ${name})`);
    }
  }

  // Validate description field
  if (!descMatch) {
    error('Frontmatter missing required field: description');
  } else {
    const description = descMatch[1].trim();
    success(`description: ${description.substring(0, 60)}...`);

    // Check description quality
    if (description.length < 50) {
      warning('Description is too short (should be 50+ characters)');
    }

    if (!description.toLowerCase().includes('use when') && !description.toLowerCase().includes('use this when')) {
      warning('Description should include "when to use" information');
    }

    if (description.toUpperCase() === description) {
      error('Description is all caps');
    }

    if (description.includes('TODO')) {
      warning('Description contains TODO - not ready for use');
    }
  }
}

// Check for prohibited files
const prohibitedFiles = ['README.md', 'INSTALLATION.md', 'CHANGELOG.md', 'CONTRIBUTING.md'];
prohibitedFiles.forEach(file => {
  if (fs.existsSync(path.join(skillPath, file))) {
    error(`Prohibited file found: ${file} (documentation should be in SKILL.md or references/)`);
  }
});

// Check directory structure
const subdirs = ['scripts', 'references', 'assets'];
subdirs.forEach(dir => {
  const dirPath = path.join(skillPath, dir);
  if (fs.existsSync(dirPath)) {
    if (!fs.statSync(dirPath).isDirectory()) {
      error(`${dir}/ exists but is not a directory`);
    } else {
      success(`${dir}/ directory exists`);
    }
  }
});

// Check for file references in SKILL.md
const fileRefRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
let match;
const brokenLinks = [];

while ((match = fileRefRegex.exec(skillContent)) !== null) {
  const linkText = match[1];
  const linkTarget = match[2];

  // Skip external links
  if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
    continue;
  }

  // Skip anchors
  if (linkTarget.startsWith('#')) {
    continue;
  }

  // Check if file exists
  const targetPath = path.join(skillPath, linkTarget);
  if (!fs.existsSync(targetPath)) {
    brokenLinks.push({ text: linkText, target: linkTarget });
  }
}

if (brokenLinks.length > 0) {
  error(`Found ${brokenLinks.length} broken link(s) in SKILL.md:`);
  brokenLinks.forEach(link => {
    console.error(`  - [${link.text}](${link.target})`);
  });
} else {
  success('All file references in SKILL.md are valid');
}

// Check SKILL.md size
const skillMdLines = skillContent.split('\n').length;
if (skillMdLines > 500) {
  warning(`SKILL.md is ${skillMdLines} lines (recommend <500 for context efficiency)`);
} else {
  success(`SKILL.md size is reasonable (${skillMdLines} lines)`);
}

// Check for TODOs in SKILL.md
const todoCount = (skillContent.match(/TODO/gi) || []).length;
if (todoCount > 0) {
  warning(`SKILL.md contains ${todoCount} TODO(s) - may not be ready for use`);
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log('Validation Summary');
console.log('='.repeat(50));

if (errorCount === 0 && warningCount === 0) {
  console.log('✅ All checks passed! Skill is ready to use.');
  process.exit(0);
} else {
  if (errorCount > 0) {
    console.log(`❌ ${errorCount} error(s) found`);
  }
  if (warningCount > 0) {
    console.log(`⚠️  ${warningCount} warning(s) found`);
  }

  if (errorCount > 0) {
    console.log('\n❌ Skill has errors and should be fixed before use.');
    process.exit(1);
  } else {
    console.log('\n⚠️  Skill has warnings but can be used. Consider addressing them.');
    process.exit(0);
  }
}
