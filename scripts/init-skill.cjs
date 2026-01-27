#!/usr/bin/env node

/**
 * Skill Initialization Script
 *
 * Creates the directory structure and template files for a new skill.
 *
 * Usage:
 *   node scripts/init-skill.js <skill-name>
 *   node scripts/init-skill.js <skill-name> --path <output-directory>
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Skill Initialization Script

Usage:
  node scripts/init-skill.js <skill-name>
  node scripts/init-skill.js <skill-name> --path <output-directory>

Examples:
  node scripts/init-skill.js my-new-skill
  node scripts/init-skill.js my-new-skill --path ./custom-skills

This will create:
  skills/my-new-skill/
  ├── SKILL.md (template with TODOs)
  ├── scripts/ (directory for executable code)
  ├── references/ (directory for documentation)
  └── assets/ (directory for output files)
`);
  process.exit(0);
}

const skillName = args[0];
let outputDir = path.join(process.cwd(), 'skills');

// Check for --path flag
const pathIndex = args.indexOf('--path');
if (pathIndex !== -1 && args[pathIndex + 1]) {
  outputDir = path.resolve(args[pathIndex + 1]);
}

const skillDir = path.join(outputDir, skillName);

// Validate skill name
if (!/^[a-z0-9-]+$/.test(skillName)) {
  console.error(`❌ Error: Skill name must be lowercase with hyphens only (got: ${skillName})`);
  process.exit(1);
}

// Check if skill already exists
if (fs.existsSync(skillDir)) {
  console.error(`❌ Error: Skill '${skillName}' already exists at ${skillDir}`);
  process.exit(1);
}

// Create directory structure
console.log(`📁 Creating skill directory: ${skillDir}`);
fs.mkdirSync(skillDir, { recursive: true });
fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
fs.mkdirSync(path.join(skillDir, 'assets'), { recursive: true });

// Create SKILL.md template
const skillTemplate = `---
name: ${skillName}
description: TODO: Describe what this skill does AND when to use it. Include specific scenarios, file types, or contexts that should trigger this skill.
---

# ${skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

TODO: Add a brief overview of what this skill provides.

## Quick Start

TODO: Provide a simple example or quick start guide.

## Usage

TODO: Add detailed instructions for using this skill.

## Examples

TODO: Include concrete examples of how to use this skill.

## Bundled Resources

### Scripts

TODO: If this skill includes executable scripts, describe them here:

- \`scripts/example.py\` - Brief description of what it does

### References

TODO: If this skill includes reference documentation, list it here:

- [REFERENCE.md](references/REFERENCE.md) - Detailed documentation
- [EXAMPLES.md](references/EXAMPLES.md) - More examples

### Assets

TODO: If this skill includes output assets, list them here:

- \`assets/template.txt\` - Template file description

## Notes

TODO: Add any additional notes, warnings, or tips.
`;

fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillTemplate);

// Create example files
const exampleScript = `#!/usr/bin/env python3
"""
Example script for ${skillName}

This is a placeholder script. Replace with your actual implementation.
"""

def main():
    print("Hello from ${skillName}!")
    # TODO: Implement your script logic here

if __name__ == "__main__":
    main()
`;

fs.writeFileSync(path.join(skillDir, 'scripts', 'example.py'), exampleScript);
fs.chmodSync(path.join(skillDir, 'scripts', 'example.py'), 0o755);

const exampleReference = `# ${skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Reference

This is an example reference document. Replace with your actual documentation.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)

## Overview

TODO: Provide an overview of what this reference covers.

## Getting Started

TODO: Add getting started information.

## API Reference

TODO: Document APIs, methods, or processes.
`;

fs.writeFileSync(path.join(skillDir, 'references', 'REFERENCE.md'), exampleReference);

const exampleAsset = `This is an example asset file.

Replace this with actual templates, boilerplate code, or other output files.
`;

fs.writeFileSync(path.join(skillDir, 'assets', 'template.txt'), exampleAsset);

// Create .gitkeep files to ensure empty directories are tracked
fs.writeFileSync(path.join(skillDir, 'scripts', '.gitkeep'), '');
fs.writeFileSync(path.join(skillDir, 'references', '.gitkeep'), '');
fs.writeFileSync(path.join(skillDir, 'assets', '.gitkeep'), '');

// Success message
console.log(`
✅ Skill '${skillName}' initialized successfully!

Created files:
  ${path.relative(process.cwd(), skillDir)}/
  ├── SKILL.md (template with TODOs)
  ├── scripts/
  │   └── example.py
  ├── references/
  │   └── REFERENCE.md
  └── assets/
      └── template.txt

Next steps:
  1. Edit SKILL.md and complete all TODOs
  2. Update the description in the frontmatter (critical for triggering)
  3. Implement your scripts, references, and assets
  4. Delete example files you don't need
  5. Test the skill on real tasks

See skills/skill-creator/SKILL.md for detailed guidance.
`);
