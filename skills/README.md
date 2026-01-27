# Skills Directory

This directory contains Claude Code skills that extend Claude's capabilities with specialized knowledge, workflows, and tool integrations.

## Available Skills

### skill-creator
A comprehensive guide for creating effective skills. Use this when you want to create a new skill or update an existing one.

**Location**: `skills/skill-creator/SKILL.md`

**Use this skill when**:
- Creating a new skill from scratch
- Understanding skill architecture and best practices
- Learning about progressive disclosure patterns
- Organizing scripts, references, and assets effectively

**Invoke with**: `/skill-creator` or "use the skill-creator skill"

---

### agent-browser
Automates browser interactions for web testing, form filling, screenshots, and data extraction.

**Location**: `skills/agent-browser/SKILL.md`

**Use this skill when**:
- Navigating websites and extracting information
- Filling forms and clicking buttons
- Taking screenshots or generating PDFs
- Testing web applications
- Recording browser interactions

**Invoke with**: `/agent-browser` or "use the agent-browser skill"

**Example usage**:
```bash
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser click @e1
agent-browser screenshot page.png
```

---

## What are Skills?

Skills are modular, self-contained packages that extend Claude's capabilities by providing:

1. **Specialized workflows** - Multi-step procedures for specific domains
2. **Tool integrations** - Instructions for working with specific file formats or APIs
3. **Domain expertise** - Company-specific knowledge, schemas, business logic
4. **Bundled resources** - Scripts, references, and assets for complex tasks

## How to Use Skills with Claude Code

Skills can be invoked through Claude Code CLI. Each skill has a SKILL.md file with:

- **YAML frontmatter**: Metadata including name and description
- **Markdown body**: Instructions and guidance
- **Bundled resources**: Optional scripts, references, and assets

### Installation

Skills must be in `~/.claude/skills/` for Claude Code to find them:

```bash
# Sync project skills to Claude
cp -r skills/* ~/.claude/skills/
```

### Invocation

**Method 1: By name**
```
/skill-creator
/agent-browser
```

**Method 2: Explicit request**
```
Use the skill-creator skill
Use the agent-browser skill to test this website
```

**Method 3: Context-based (automatic)**
- Ask questions that match the skill's description
- Claude will automatically load the relevant skill

## Creating a New Skill

To create a new skill:

1. **Initialize the structure**:
   ```bash
   node scripts/init-skill.cjs my-skill
   ```

2. **Edit SKILL.md** with frontmatter and instructions

3. **Add resources** (scripts, references, assets) as needed

4. **Validate**:
   ```bash
   node scripts/validate-skill.cjs skills/my-skill
   ```

5. **Install to Claude**:
   ```bash
   cp -r skills/my-skill ~/.claude/skills/
   ```

6. **Test**: Use the skill on real tasks and iterate

See `skills/skill-creator/SKILL.md` for the complete guide.

## Best Practices

### Keep Skills Focused
Each skill should have a clear, specific purpose. Don't create monolithic "do everything" skills.

### Use Progressive Disclosure
- Metadata (name + description): Always in context (~100 words)
- SKILL.md body: When skill triggers (<5k words)
- Bundled resources: As needed by Claude

### Write Clear Descriptions
The description is the primary triggering mechanism. Include:
- What the skill does
- When to use it
- Key scenarios and file types

### Organize Resources
- **scripts/**: Executable code for deterministic operations
- **references/**: Documentation to load into context when needed
- **assets/**: Files used in output (not loaded into context)

## Skill Directory Structure

```
skills/
├── README.md (this file)
├── skill-creator/
│   └── SKILL.md
├── agent-browser/
│   ├── SKILL.md
│   ├── references/
│   │   ├── snapshot-refs.md
│   │   ├── session-management.md
│   │   ├── authentication.md
│   │   ├── video-recording.md
│   │   └── proxy-support.md
│   └── templates/
│       ├── form-automation.sh
│       ├── authenticated-session.sh
│       └── capture-workflow.sh
└── [other-skills]/
```

## Examples of Good Skills

Skills work well for:
- **Browser automation**: Web testing, form filling, screenshots (agent-browser)
- **PDF manipulation**: Scripts for rotating, merging, extracting text
- **API clients**: Specialized integrations with rate limiting and error handling
- **Document generation**: Templates and formatting standards
- **Data analysis**: Company-specific schemas and reporting patterns
- **Database migrations**: Multi-step workflows with validation
- **Code scaffolding**: Project templates and boilerplate

## Skill Ideas for AIOM-V2

Based on your AI COO Dashboard project, consider creating:

1. **odoo-integration** - Odoo API patterns, models, and schemas
2. **ai-coo-workflows** - Business workflow templates and action patterns
3. **dashboard-builder** - React component and API route patterns
4. **drizzle-migrations** - Database schema migration workflows
5. **claude-ai-integration** - Claude SDK best practices and prompt patterns

## Skill Maintenance

When updating skills:
1. Test changes on real tasks before committing
2. Keep SKILL.md concise (prefer references for detailed docs)
3. Version scripts when making breaking changes
4. Document any required dependencies
5. Sync to Claude after changes: `cp -r skills/[skill-name] ~/.claude/skills/`

## Quick Commands Reference

```bash
# List installed skills
ls ~/.claude/skills/

# Install a skill
cp -r skills/my-skill ~/.claude/skills/

# Sync all skills
cp -r skills/* ~/.claude/skills/

# Create new skill
node scripts/init-skill.cjs my-new-skill

# Validate skill
node scripts/validate-skill.cjs skills/my-skill

# Remove skill
rm -rf ~/.claude/skills/my-skill
```

## Getting Help

- **skill-creator guide**: `skills/skill-creator/SKILL.md`
- **How to use skills**: `HOW_TO_USE_SKILLS.md`
- **Quick start**: `SKILLS_QUICKSTART.md`
- **Anthropic Skills**: https://github.com/anthropics/skills
- **Claude Code**: https://github.com/anthropics/claude-code

## Status

✅ **skill-creator** - Installed and ready
✅ **agent-browser** - Installed and ready

Try them now:
- `/skill-creator` - Learn about skill creation
- `/agent-browser` - Automate browser tasks
