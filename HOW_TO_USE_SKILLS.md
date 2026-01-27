# How to Use Skills in Claude Code

## ✅ Skill-Creator is Now Installed!

The skill-creator skill has been installed to `~/.claude/skills/skill-creator/` where Claude Code can find it.

## How Skills Work in Claude Code

### Skills Location

Skills must be in one of these locations for Claude Code to see them:

1. **User-level skills** (recommended): `~/.claude/skills/`
2. **Project-level skills**: `./.claude/skills/` (in your project root)

### Skill Structure

Each skill is a directory containing a `SKILL.md` file:

```
~/.claude/skills/
└── skill-creator/
    └── SKILL.md
```

The `SKILL.md` file has:
- **YAML frontmatter** with `name` and `description`
- **Markdown body** with instructions and guidance

## How to Use the Skill-Creator Skill

### Method 1: Invoke by Name

Simply type:
```
/skill-creator
```

Or ask:
```
Use the skill-creator skill
```

### Method 2: Trigger by Context

The skill will automatically activate when you ask questions that match its description:
- "How do I create a new skill?"
- "Help me design a skill for Odoo integration"
- "What are skill best practices?"
- "I want to organize my scripts into a skill"

### Method 3: Explicit Request

You can explicitly request it:
```
I need help creating a skill for [domain]. Use the skill-creator skill.
```

## Verifying the Skill is Available

Run this command to check:

```bash
ls -la ~/.claude/skills/skill-creator/SKILL.md
```

You should see the SKILL.md file. ✅

## Testing the Skill

Try these prompts:

1. **"Use the skill-creator skill"**
   - Should load the skill and show you the guide

2. **"I want to create a new skill for Odoo integration"**
   - Should automatically trigger the skill-creator

3. **"What are the best practices for organizing skill resources?"**
   - Should reference the skill-creator guidance

## Creating Additional Skills

Once you understand skill-creator, create more skills:

### Quick Method

```bash
# Create in project (for version control)
node scripts/init-skill.cjs my-new-skill

# Copy to Claude Code directory
cp -r skills/my-new-skill ~/.claude/skills/
```

### Recommended Workflow

1. **Develop in project**: Create skills in `./skills/` for version control
2. **Copy to Claude**: Copy to `~/.claude/skills/` to make them available
3. **Test and iterate**: Use the skills, improve them, sync back

### Keeping Skills in Sync

Create a sync script:

```bash
#!/bin/bash
# sync-skills.sh
cp -r skills/* ~/.claude/skills/
echo "✅ Skills synced to ~/.claude/skills/"
```

## Skill Discovery

Skills are discovered by:

1. **Name matching**: `/skill-name` or "use the skill-name skill"
2. **Description matching**: Keywords in the description field
3. **Context relevance**: Claude determines if skill is relevant to conversation

## Troubleshooting

### Skill Not Found

**Problem**: Claude says skill doesn't exist

**Solution**:
```bash
# Check if skill is in the right location
ls ~/.claude/skills/skill-creator/SKILL.md

# If missing, copy it
cp -r skills/skill-creator ~/.claude/skills/
```

### Skill Not Triggering

**Problem**: Skill doesn't activate automatically

**Solutions**:
1. Invoke explicitly: `/skill-creator`
2. Check description includes relevant keywords
3. Be more specific in your request

### Skill Outdated

**Problem**: Made changes but skill uses old version

**Solution**:
```bash
# Sync changes from project to Claude
cp -r skills/skill-creator ~/.claude/skills/
```

## Available Skills

Currently installed:

### skill-creator
**Location**: `~/.claude/skills/skill-creator/`

**Triggers on**:
- Creating new skills
- Updating existing skills
- Understanding skill architecture
- Learning best practices
- Organizing skill resources

**Invoke with**:
- `/skill-creator`
- "Use the skill-creator skill"
- "Help me create a skill for [domain]"

## Adding More Skills

As you create more skills for AIOM-V2:

```bash
# 1. Create in project
node scripts/init-skill.cjs odoo-integration

# 2. Develop and test
# Edit skills/odoo-integration/SKILL.md
# Add scripts, references, assets

# 3. Validate
node scripts/validate-skill.cjs skills/odoo-integration

# 4. Install to Claude Code
cp -r skills/odoo-integration ~/.claude/skills/

# 5. Test
# Ask Claude: "Use the odoo-integration skill"
```

## Best Practices

1. **Keep project skills as source of truth**: Version control `./skills/`
2. **Copy to Claude for use**: Install to `~/.claude/skills/`
3. **Sync regularly**: After making changes, re-copy to Claude
4. **Test thoroughly**: Use skills on real tasks, iterate based on experience

## Example: Full Skill Lifecycle

```bash
# 1. Create skill
node scripts/init-skill.cjs odoo-integration

# 2. Edit SKILL.md
# Update description, add instructions, create references

# 3. Validate
node scripts/validate-skill.cjs skills/odoo-integration

# 4. Install
cp -r skills/odoo-integration ~/.claude/skills/

# 5. Test
# Ask Claude: "Use odoo-integration to query overdue invoices"

# 6. Improve based on usage
# Edit skills/odoo-integration/SKILL.md

# 7. Re-sync
cp -r skills/odoo-integration ~/.claude/skills/

# 8. Commit to version control
git add skills/odoo-integration
git commit -m "Add Odoo integration skill"
```

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

## Next Steps

1. **Try the skill**: `/skill-creator` or "use the skill-creator skill"
2. **Create your first skill**: Start with something simple like odoo-integration
3. **Read the guide**: Review `skills/skill-creator/SKILL.md`
4. **Iterate**: Use skills on real tasks and improve them

---

**Status**: ✅ skill-creator is installed and ready to use!

**Test it now**: Just say "use the skill-creator skill" or "/skill-creator"
