---
name: skill-creator
description: Comprehensive guide for creating effective skills that extend Claude's capabilities. Use this skill when you want to (1) create a new skill from scratch, (2) update or improve an existing skill, (3) understand skill architecture and best practices, (4) learn about progressive disclosure patterns, or (5) organize scripts, references, and assets effectively.
---

# Skill Creator

A comprehensive guide for creating effective skills that extend Claude's capabilities.

## About Skills

**Definition**: Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools. They function as "onboarding guides" for specific domains or tasks.

**What Skills Provide**:
1. **Specialized workflows** - Multi-step procedures for specific domains
2. **Tool integrations** - Instructions for working with specific file formats or APIs
3. **Domain expertise** - Company-specific knowledge, schemas, business logic
4. **Bundled resources** - Scripts, references, and assets for complex tasks

## Core Principles

### 1. Concise is Key

The context window is a public good shared with system prompt, conversation history, other skills, and user requests.

**Default assumption**: Claude is already very smart.

- Only add context Claude doesn't already have
- Prefer concise examples over verbose explanations

### 2. Set Appropriate Degrees of Freedom

Match specificity to task fragility and variability:

**High freedom (text-based instructions)**:
- Multiple valid approaches exist
- Context-dependent decisions required
- Heuristic guidance appropriate

**Medium freedom (pseudocode/scripts with parameters)**:
- Preferred pattern exists
- Some variation acceptable
- Configuration affects behavior

**Low freedom (specific scripts, few parameters)**:
- Operations are fragile/error-prone
- Consistency critical
- Specific sequence required

## Anatomy of a Skill

### Directory Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/      - Executable code (Python/Bash/etc.)
    ├── references/   - Documentation for context loading
    └── assets/       - Files used in output (templates, icons, fonts, etc.)
```

### SKILL.md (Required)

**Frontmatter (YAML)**:
- `name`: Skill identifier
- `description`: Primary triggering mechanism - includes what the skill does AND when to use it

**Body (Markdown)**:
- Instructions and guidance for using the skill
- Only loaded AFTER skill triggers

### Bundled Resources (Optional)

**Scripts (scripts/)**
- Executable code (Python/Bash/etc.) for deterministic reliability
- Use when: Same code repeatedly rewritten or deterministic reliability needed
- Example: `scripts/rotate_pdf.py`
- Benefits: Token efficient, deterministic, can execute without loading into context

**References (references/)**
- Documentation intended to be loaded into context as needed
- Use when: Documentation that Claude should reference while working
- Examples: Financial schemas, API docs, company policies, workflow guides
- Best practice: If files >10k words, include grep search patterns in SKILL.md
- **Avoid duplication**: Information should live in SKILL.md OR references files, not both

**Assets (assets/)**
- Files used in output, NOT loaded into context
- Use when: Skill needs files for final output
- Examples: Templates, images, boilerplate code, fonts
- Benefits: Separates output resources from documentation

### What NOT to Include

Do NOT create:
- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- Other auxiliary documentation

The skill should only contain information needed for Claude to execute tasks.

## Progressive Disclosure Design Principle

**Three-level loading system**:
1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Claude (unlimited size for scripts)

### Progressive Disclosure Patterns

**Pattern 1: High-level guide with references**

```markdown
# PDF Processing

## Quick start
Extract text with pdfplumber:
[code example]

## Advanced features
- **Form filling**: See [FORMS.md](FORMS.md) for complete guide
- **API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
- **Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
```

**Pattern 2: Domain-specific organization**

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

**Pattern 3: Conditional details**

```markdown
# DOCX Processing

## Creating documents
Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents
For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

**Important Guidelines**:
- **Avoid deeply nested references** - Keep all reference files one level deep from SKILL.md
- **Structure longer reference files** - For files >100 lines, include table of contents at top
- **Keep SKILL.md body under 500 lines** to minimize context bloat

## Skill Creation Process

### Step 1: Understanding the Skill with Concrete Examples

Understand how the skill will be used through:
- Direct user examples
- Generated examples validated with user feedback

Example questions:
- "What functionality should this skill support?"
- "Can you give examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"

Conclude when there's clear sense of functionality the skill should support.

### Step 2: Planning the Reusable Skill Contents

Analyze each concrete example:
1. Consider execution from scratch
2. Identify reusable scripts, references, and assets

**Example: pdf-editor** - Rotating a PDF requires rewriting code → `scripts/rotate_pdf.py`

**Example: frontend-webapp-builder** - HTML/React boilerplate reused → `assets/hello-world/`

**Example: big-query** - Rediscovering schemas each time → `references/schema.md`

### Step 3: Initializing the Skill

Create the skill directory structure manually or with a script:

```bash
mkdir -p skill-name
mkdir -p skill-name/scripts
mkdir -p skill-name/references
mkdir -p skill-name/assets
```

Then create SKILL.md with frontmatter template:

```yaml
---
name: skill-name
description: What the skill does and when to use it
---

# Skill Name

[Add skill instructions here]
```

### Step 4: Edit the Skill

Remember: Creating for another Claude instance to use.

**Start with Reusable Skill Contents**:
- Implement scripts, references, and assets identified in Step 2
- Test scripts by actually running them
- Delete unused example files

**Update SKILL.md**:

**Frontmatter**:
- `name`: Skill name
- `description`:
  - Include what skill does AND when to use it
  - Include all "when to use" information here (not in body, as body only loads after triggering)
  - Example: "Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. Use when Claude needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks"

**Body**:
- Write instructions for using the skill and bundled resources
- Use imperative/infinitive form

### Step 5: Testing and Iteration

After creating the skill:
1. Use the skill on real tasks
2. Notice struggles or inefficiencies
3. Identify how SKILL.md or bundled resources should be updated
4. Implement changes and test again

## Best Practices

### Description Writing

The description is crucial because it's the primary triggering mechanism:

**Good description**:
```yaml
description: Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. Use when Claude needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks
```

**Poor description**:
```yaml
description: Handles DOCX files
```

### Instruction Writing

Use imperative/infinitive form:
- ✅ "Use pdfplumber for text extraction"
- ✅ "To rotate a PDF, call scripts/rotate_pdf.py"
- ❌ "You should use pdfplumber for text extraction"
- ❌ "I recommend calling scripts/rotate_pdf.py"

### Resource Organization

**When to use scripts vs references vs assets**:

**Scripts**:
- Code that needs to be executed
- Deterministic operations
- Reusable functionality

**References**:
- Documentation to load into context
- Schemas, API docs, policies
- Information Claude needs to reference while working

**Assets**:
- Files used in output
- NOT loaded into context
- Templates, boilerplate, images

### Size Guidelines

- **SKILL.md body**: <500 lines (preferably <5k words)
- **Reference files**: <10k words (if larger, provide search patterns)
- **Scripts**: No size limit (not loaded into context unless needed)

## Common Patterns

### Pattern: Multi-step Workflow

```markdown
# Database Migration

## Process

1. **Analyze current schema**
   - Run `scripts/analyze_schema.py`
   - Review output for breaking changes

2. **Generate migration**
   - Use `scripts/generate_migration.py`
   - Specify up/down operations

3. **Test migration**
   - Apply to staging: `scripts/apply.py --env staging`
   - Run test suite
   - Verify data integrity

4. **Deploy to production**
   - Create backup
   - Apply migration: `scripts/apply.py --env production`
   - Monitor logs
```

### Pattern: Tool Integration

```markdown
# API Client

## Quick Start

Use the Acme API client:

```python
from scripts.acme_client import AcmeClient

client = AcmeClient(api_key="...")
result = client.get_data(query="...")
```

## Advanced Usage

See [API_REFERENCE.md](API_REFERENCE.md) for:
- Authentication methods
- Rate limiting
- Error handling
- Pagination
```

### Pattern: Domain Expertise

```markdown
# Financial Reporting

## Company Schema

See [SCHEMA.md](SCHEMA.md) for complete database schema.

## Key Metrics

- **ARR**: See [references/arr_calculation.md](references/arr_calculation.md)
- **Churn**: See [references/churn_analysis.md](references/churn_analysis.md)
- **CAC**: See [references/customer_acquisition.md](references/customer_acquisition.md)

## Reporting Templates

Monthly report template: `assets/monthly_report_template.xlsx`
```

## Troubleshooting

### Skill Not Triggering

**Problem**: Skill doesn't activate when expected

**Solutions**:
- Enhance the `description` field with more "when to use" scenarios
- Include specific keywords user might say
- Be explicit about file types, domains, or contexts

### Skill Too Large

**Problem**: SKILL.md is loading too much context

**Solutions**:
- Move detailed documentation to reference files
- Use progressive disclosure patterns
- Split large reference files by domain/topic
- Provide search patterns instead of full text

### Unclear Instructions

**Problem**: Claude struggles to execute skill correctly

**Solutions**:
- Add concrete examples
- Use imperative language
- Reduce degrees of freedom for fragile operations
- Test skill on actual tasks and iterate

## Summary

Creating effective skills requires:

1. **Understanding** - Concrete examples of skill usage
2. **Planning** - Identifying reusable scripts, references, and assets
3. **Structuring** - Proper directory layout and progressive disclosure
4. **Writing** - Clear frontmatter and concise instructions
5. **Testing** - Real-world usage and iteration

Remember: Skills extend Claude's capabilities by providing **only the context Claude needs** to excel at specific tasks.
