# Skills Quick Start Guide

## What You Just Added

The **skill-creator** skill has been added to your project. This is a comprehensive guide for creating effective Claude Code skills that extend Claude's capabilities.

## Files Created

```
C:\repos\AIOM-V2\
├── skills/
│   ├── README.md (overview and best practices)
│   └── skill-creator/
│       └── SKILL.md (complete skill creation guide)
├── scripts/
│   └── init-skill.js (helper script to create new skills)
└── SKILLS_QUICKSTART.md (this file)
```

## Using the skill-creator Skill

The skill-creator skill provides guidance on:

- Understanding skill architecture
- Creating modular, reusable skills
- Organizing scripts, references, and assets
- Writing effective skill descriptions
- Progressive disclosure patterns
- Best practices and common patterns

**To use it**: Simply ask Claude to "use the skill-creator skill" or "create a new skill" and Claude will automatically load the guidance.

## Creating Your First Skill

### Option 1: Using the Helper Script

```bash
# Create a new skill with default structure
node scripts/init-skill.js my-new-skill

# Create in a custom directory
node scripts/init-skill.js my-new-skill --path ./custom-skills
```

This creates:
- SKILL.md template with TODOs
- scripts/ directory with example script
- references/ directory with example docs
- assets/ directory with example template

### Option 2: Manual Creation

```bash
# Create directories
mkdir -p skills/my-new-skill/{scripts,references,assets}

# Create SKILL.md
cat > skills/my-new-skill/SKILL.md << 'EOF'
---
name: my-new-skill
description: What it does and when to use it
---

# My New Skill

[Add instructions here]
EOF
```

## Skill Ideas for AIOM-V2 Project

Based on your AI COO Dashboard project, here are some useful skills you could create:

### 1. odoo-integration
**Purpose**: Comprehensive Odoo API interaction patterns, schemas, and best practices

**Contents**:
- `SKILL.md`: Overview of Odoo integration patterns
- `references/odoo-models.md`: Complete model schemas (account.move, crm.lead, etc.)
- `references/api-patterns.md`: Common search_read, create, write patterns
- `scripts/test-odoo-connection.js`: Quick connection tester

### 2. ai-coo-workflows
**Purpose**: Business workflow templates and autonomous action patterns

**Contents**:
- `SKILL.md`: How to design AI COO workflows
- `references/action-types.md`: Complete action type catalog
- `references/approval-patterns.md`: When to require approval
- `assets/workflow-templates/`: JSON templates for common workflows

### 3. dashboard-builder
**Purpose**: React dashboard component patterns and TanStack Router API routes

**Contents**:
- `SKILL.md`: Dashboard creation guide
- `references/component-patterns.md`: Reusable component patterns
- `references/api-route-patterns.md`: TanStack Router server handlers
- `assets/components/`: Boilerplate components

### 4. drizzle-migrations
**Purpose**: Database schema migrations and Drizzle ORM patterns

**Contents**:
- `SKILL.md`: Migration workflow guide
- `references/schema-patterns.md`: Common table patterns
- `scripts/generate-migration.js`: Migration generator
- `scripts/validate-schema.js`: Schema validator

### 5. claude-ai-integration
**Purpose**: Claude SDK usage patterns, prompt engineering, and cost optimization

**Contents**:
- `SKILL.md`: Claude SDK best practices
- `references/prompt-patterns.md`: Effective prompts for different tasks
- `references/caching-strategies.md`: Prompt caching for cost reduction
- `scripts/analyze-costs.js`: Cost analysis tool

## Example: Creating an Odoo Integration Skill

```bash
# 1. Initialize the skill
node scripts/init-skill.js odoo-integration

# 2. Edit SKILL.md
# Update the frontmatter description:
---
name: odoo-integration
description: Comprehensive Odoo ERP integration patterns, API usage, and schema reference. Use when working with Odoo models, creating/updating records, querying data, or understanding Odoo business logic.
---

# 3. Add reference documentation
cat > skills/odoo-integration/references/models.md << 'EOF'
# Odoo Model Reference

## account.move (Invoices)
- id: integer
- name: string (invoice number)
- partner_id: many2one (res.partner)
- amount_total: float
- state: selection (draft, posted, cancel)
- invoice_date: date
- invoice_date_due: date
EOF

# 4. Add a helper script
cat > skills/odoo-integration/scripts/quick-query.py << 'EOF'
#!/usr/bin/env python3
import xmlrpc.client

def query_odoo(model, domain, fields, limit=10):
    """Quick Odoo query helper"""
    # Implementation here
    pass
EOF

# 5. Test the skill
# Ask Claude: "Use the odoo-integration skill to show me all overdue invoices"
```

## Skill Best Practices for AIOM-V2

### 1. Keep Skills Domain-Specific

✅ Good: `odoo-integration`, `ai-coo-workflows`, `dashboard-builder`
❌ Bad: `general-utilities`, `helpers`, `misc-tools`

### 2. Use Progressive Disclosure

Put high-level guidance in SKILL.md, detailed schemas in references:

```markdown
# SKILL.md
For invoice queries, use the account.move model. See [models.md](references/models.md) for complete field reference.

# references/models.md
(Complete 500-line schema documentation)
```

### 3. Include Real Examples

Use actual code from your project:

```typescript
// In SKILL.md
## Fetching pending actions

const actions = await db
  .select()
  .from(autonomousActions)
  .where(eq(autonomousActions.status, 'pending_approval'));
```

### 4. Document Integration Points

Show how skills connect to your project structure:

```markdown
# Odoo Integration Skill

## Project Integration

- Client: `src/lib/odoo/client.ts`
- Data access: `src/data-access/odoo.ts`
- Config: `src/lib/odoo/config.ts`
- Mock data: `src/lib/ai-coo/data-fetchers/financial-mock.ts`
```

## Testing Skills

Test skills by:

1. **Invoking explicitly**: "Use the [skill-name] skill to..."
2. **Implicit triggering**: Ask questions in the skill's domain
3. **Real tasks**: Use on actual project work, not toy examples

## Iterating on Skills

After using a skill:

1. Notice where Claude struggled or asked for clarification
2. Identify what documentation/examples would have helped
3. Update SKILL.md or add reference files
4. Test again on similar tasks

## Next Steps

1. **Review the skill-creator skill**: Read `skills/skill-creator/SKILL.md`
2. **Create your first skill**: Use the init-skill script or manual approach
3. **Start with something small**: Maybe an odoo-integration skill with just invoice queries
4. **Iterate based on usage**: Add more as you find repetitive tasks

## Resources

- **Anthropic Skills Repo**: https://github.com/anthropics/skills
- **Claude Code Docs**: https://github.com/anthropics/claude-code
- **Local Skill Guide**: `skills/skill-creator/SKILL.md`

## Getting Help

Ask Claude:
- "How do I create a skill for [specific task]?"
- "Use the skill-creator skill to help me design a [domain] skill"
- "What should I include in a skill for [use case]?"

The skill-creator skill provides comprehensive guidance and will help you through the process!
