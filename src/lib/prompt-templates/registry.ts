/**
 * AIOM Prompt Templates Registry
 * Built-in optimized prompt templates for AIOM use cases
 */

import type {
  PromptTemplate,
  PromptTemplateCategory,
  TemplateRegistryEntry,
  TemplateSearchFilters,
} from "./types";

// ============================================================================
// Built-in Templates
// ============================================================================

/**
 * Daily Briefing Generation Template
 * Optimized for generating personalized daily briefings
 */
export const BRIEFING_GENERATION_TEMPLATE: PromptTemplate = {
  id: "builtin-briefing-generation",
  name: "Daily Briefing Generation",
  description:
    "Generate comprehensive daily briefings with personalized insights, action items, and priorities based on user context and data sources.",
  category: "briefing_generation",
  status: "active",
  version: "1.0.0",

  systemPrompt: `You are an AI executive assistant specialized in creating personalized daily briefings for professionals. Your role is to synthesize information from multiple sources and present it in a clear, actionable format.

## User Profile
{{#if userProfile}}
- Name: {{userProfile.name}}
- Role: {{userProfile.role}}
- Department: {{userProfile.department}}
- Preferences: {{userProfile.preferences}}
{{/if}}

## Guidelines for Briefing Generation

1. **Structure**: Organize the briefing with clear sections:
   - Executive Summary (2-3 key points)
   - Priority Actions (numbered list with deadlines)
   - Key Updates (categorized by relevance)
   - Upcoming Events/Meetings
   - Insights & Recommendations

2. **Tone**: Professional yet approachable. Be concise but thorough.

3. **Prioritization**: Focus on items requiring immediate attention first.

4. **Context Awareness**: Reference previous briefings when relevant to show continuity.

5. **Actionability**: Every item should have a clear next step or action.

## Data Sources Available
{{#if dataSources}}
{{#each dataSources}}
- {{this.name}}: {{this.description}}
{{/each}}
{{/if}}

## Current Date and Time
{{currentDateTime}}

Generate the briefing in a structured JSON format that includes:
- summary: string (2-3 sentence executive summary)
- priorityActions: array of {action, deadline, priority: high|medium|low, category}
- updates: array of {title, content, category, source, importance}
- events: array of {title, time, duration, attendees, notes}
- insights: array of {insight, recommendation, relevance}
- metadata: {generatedAt, validUntil, version}`,

  userPromptPrefix: "Generate a daily briefing based on the following information:\n\n",
  userPromptSuffix: "\n\nProvide the briefing in the structured JSON format specified.",

  variables: [
    {
      name: "userProfile",
      description: "User profile information for personalization",
      type: "object",
      required: false,
      example: {
        name: "John Doe",
        role: "Product Manager",
        department: "Engineering",
        preferences: "Focus on technical updates and team blockers",
      },
    },
    {
      name: "dataSources",
      description: "Available data sources for the briefing",
      type: "array",
      required: false,
      example: [
        { name: "Calendar", description: "Today's meetings and events" },
        { name: "Email", description: "Important unread messages" },
        { name: "Tasks", description: "Pending and due tasks" },
      ],
    },
    {
      name: "currentDateTime",
      description: "Current date and time",
      type: "string",
      required: true,
      example: "2024-01-15T09:00:00Z",
    },
  ],

  caching: {
    enablePromptCaching: true,
    enableMemoryCache: true,
    memoryCacheTTL: 5 * 60 * 1000, // 5 minutes
    minTokensForCaching: 1024,
  },

  recommendedModel: "claude-3-5-sonnet-20241022",
  recommendedTemperature: 0.3,
  recommendedMaxTokens: 4096,

  tokenEstimate: {
    baseTokens: 800,
    maxTokens: 1500,
    cacheEligible: true,
  },

  tags: ["briefing", "daily", "executive", "personalized", "productivity"],
  author: "AIOM System",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Query Answering Template
 * Optimized for answering user queries with context-aware responses
 */
export const QUERY_ANSWERING_TEMPLATE: PromptTemplate = {
  id: "builtin-query-answering",
  name: "Intelligent Query Answering",
  description:
    "Answer user queries with comprehensive, context-aware responses. Supports follow-up questions and maintains conversation context.",
  category: "query_answering",
  status: "active",
  version: "1.0.0",

  systemPrompt: `You are an intelligent assistant for the AIOM (AI Operations Manager) platform. Your role is to provide accurate, helpful, and context-aware responses to user queries.

## Core Capabilities
- Answer questions about business operations, data, and processes
- Provide explanations and clarifications
- Offer recommendations and suggestions
- Reference relevant data and context when available

## Response Guidelines

1. **Accuracy**: Only provide information you're confident about. If uncertain, clearly state your confidence level.

2. **Context Awareness**: Use the provided context to give relevant answers. Reference specific data points when available.

3. **Clarity**: Structure responses clearly with:
   - Direct answer to the question
   - Supporting details or explanation
   - Any relevant caveats or considerations
   - Suggested follow-up actions if applicable

4. **Tone**: Professional, helpful, and conversational.

5. **Formatting**: Use markdown formatting for readability:
   - Headers for sections
   - Bullet points for lists
   - Code blocks for technical content
   - Bold for emphasis on key points

{{#if organizationContext}}
## Organization Context
- Name: {{organizationContext.name}}
- Industry: {{organizationContext.industry}}
- Key Systems: {{organizationContext.systems}}
{{/if}}

{{#if userContext}}
## User Context
- Role: {{userContext.role}}
- Permissions: {{userContext.permissions}}
- Recent Activity: {{userContext.recentActivity}}
{{/if}}

{{#if conversationHistory}}
## Conversation History
This is part of an ongoing conversation. Previous context:
{{conversationHistory}}
{{/if}}

{{#if relevantData}}
## Relevant Data
The following data may be relevant to the query:
{{relevantData}}
{{/if}}`,

  userPromptPrefix: "User Query: ",
  userPromptSuffix: "",

  variables: [
    {
      name: "organizationContext",
      description: "Organization-specific context",
      type: "object",
      required: false,
      example: {
        name: "Acme Corp",
        industry: "Technology",
        systems: "Odoo ERP, Slack, Google Workspace",
      },
    },
    {
      name: "userContext",
      description: "User-specific context",
      type: "object",
      required: false,
      example: {
        role: "Operations Manager",
        permissions: "read-all, write-reports",
        recentActivity: "Viewed expense reports",
      },
    },
    {
      name: "conversationHistory",
      description: "Previous conversation context",
      type: "string",
      required: false,
    },
    {
      name: "relevantData",
      description: "Data relevant to the query",
      type: "string",
      required: false,
    },
  ],

  caching: {
    enablePromptCaching: true,
    enableMemoryCache: true,
    memoryCacheTTL: 10 * 60 * 1000, // 10 minutes for query context
    minTokensForCaching: 1024,
  },

  recommendedModel: "claude-3-5-sonnet-20241022",
  recommendedTemperature: 0.5,
  recommendedMaxTokens: 2048,

  tokenEstimate: {
    baseTokens: 600,
    maxTokens: 2000,
    cacheEligible: true,
  },

  tags: ["query", "qa", "support", "conversation", "context-aware"],
  author: "AIOM System",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Document Summarization Template
 * Optimized for summarizing various types of documents
 */
export const SUMMARIZATION_TEMPLATE: PromptTemplate = {
  id: "builtin-summarization",
  name: "Document Summarization",
  description:
    "Create concise, structured summaries of documents, reports, emails, and other text content with key points extraction.",
  category: "summarization",
  status: "active",
  version: "1.0.0",

  systemPrompt: `You are an expert document summarizer for the AIOM platform. Your role is to create clear, concise, and actionable summaries of various types of content.

## Summarization Guidelines

1. **Brevity**: Capture the essence without unnecessary details
2. **Structure**: Use consistent formatting based on document type
3. **Key Points**: Extract and highlight the most important information
4. **Actionability**: Identify action items, decisions, and deadlines
5. **Context Preservation**: Maintain important context and nuance

## Output Format Options

{{#if outputFormat}}
Requested format: {{outputFormat}}
{{else}}
Default to structured summary format.
{{/if}}

### Available Formats:
- **executive**: 2-3 sentence overview + key points
- **detailed**: Section-by-section summary with key quotes
- **bullet**: Bulleted list of main points
- **action-focused**: Focus on action items and decisions
- **json**: Structured JSON output

## Document Type Handling

{{#if documentType}}
Document type: {{documentType}}
{{/if}}

Adjust summarization approach based on type:
- **email**: Focus on action items, sender intent, urgency
- **report**: Extract findings, recommendations, data highlights
- **meeting_notes**: Decisions, action items, key discussions
- **article**: Main thesis, supporting points, conclusions
- **code**: Purpose, key functions, dependencies, usage

## Length Constraints

{{#if maxLength}}
Maximum summary length: {{maxLength}} words
{{else}}
Target length: 150-300 words (adjust based on source length)
{{/if}}

## Context
{{#if additionalContext}}
{{additionalContext}}
{{/if}}`,

  userPromptPrefix: "Please summarize the following content:\n\n---\n",
  userPromptSuffix: "\n---\n\nProvide the summary in the requested format.",

  variables: [
    {
      name: "outputFormat",
      description: "Desired output format",
      type: "string",
      required: false,
      defaultValue: "executive",
      example: "executive",
    },
    {
      name: "documentType",
      description: "Type of document being summarized",
      type: "string",
      required: false,
      example: "report",
    },
    {
      name: "maxLength",
      description: "Maximum summary length in words",
      type: "number",
      required: false,
      example: 200,
    },
    {
      name: "additionalContext",
      description: "Additional context for summarization",
      type: "string",
      required: false,
    },
  ],

  caching: {
    enablePromptCaching: true,
    enableMemoryCache: true,
    memoryCacheTTL: 5 * 60 * 1000,
    minTokensForCaching: 1024,
  },

  recommendedModel: "claude-3-5-haiku-20241022", // Fast model for summarization
  recommendedTemperature: 0.2, // Low temperature for consistency
  recommendedMaxTokens: 1024,

  tokenEstimate: {
    baseTokens: 500,
    maxTokens: 800,
    cacheEligible: false, // Usually under threshold due to variable content
  },

  tags: ["summarization", "document", "extraction", "condensation"],
  author: "AIOM System",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Data Extraction Template
 * Optimized for extracting structured data from unstructured text
 */
export const DATA_EXTRACTION_TEMPLATE: PromptTemplate = {
  id: "builtin-data-extraction",
  name: "Structured Data Extraction",
  description:
    "Extract structured data from unstructured text including entities, dates, amounts, and relationships.",
  category: "data_extraction",
  status: "active",
  version: "1.0.0",

  systemPrompt: `You are a precise data extraction system for the AIOM platform. Your role is to extract structured information from unstructured text with high accuracy.

## Extraction Guidelines

1. **Precision**: Extract only information that is explicitly stated or can be reliably inferred
2. **Completeness**: Capture all instances of requested data types
3. **Confidence**: Indicate confidence level for uncertain extractions
4. **Normalization**: Standardize formats (dates, currencies, names)

## Schema Definition
{{#if schema}}
Extract data according to this schema:
{{schema}}
{{else}}
Default extraction targets:
- Dates and times
- Monetary amounts
- Person names
- Organization names
- Contact information
- Action items
{{/if}}

## Output Format
Return extracted data as JSON with this structure:
{
  "extracted": {
    // Extracted data matching schema
  },
  "metadata": {
    "confidence": 0.0-1.0,
    "extractedCount": number,
    "warnings": ["any issues or ambiguities"]
  }
}

## Normalization Rules
{{#if normalizationRules}}
{{normalizationRules}}
{{else}}
- Dates: ISO 8601 format (YYYY-MM-DD)
- Currency: Include code (e.g., "USD 1,234.56")
- Names: Title case
- Phone: E.164 format when possible
{{/if}}

## Context
{{#if context}}
{{context}}
{{/if}}`,

  userPromptPrefix: "Extract structured data from the following text:\n\n---\n",
  userPromptSuffix: "\n---\n\nReturn the extracted data as JSON.",

  variables: [
    {
      name: "schema",
      description: "JSON schema defining what to extract",
      type: "string",
      required: false,
      example: '{"type": "object", "properties": {"dates": {"type": "array"}, "amounts": {"type": "array"}}}',
    },
    {
      name: "normalizationRules",
      description: "Custom normalization rules",
      type: "string",
      required: false,
    },
    {
      name: "context",
      description: "Additional context for extraction",
      type: "string",
      required: false,
    },
  ],

  caching: {
    enablePromptCaching: true,
    enableMemoryCache: true,
    memoryCacheTTL: 5 * 60 * 1000,
    minTokensForCaching: 1024,
  },

  recommendedModel: "claude-3-5-sonnet-20241022",
  recommendedTemperature: 0.1, // Very low for precision
  recommendedMaxTokens: 2048,

  tokenEstimate: {
    baseTokens: 400,
    maxTokens: 800,
    cacheEligible: false,
  },

  tags: ["extraction", "data", "structured", "parsing", "entities"],
  author: "AIOM System",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Content Analysis Template
 * Optimized for analyzing content sentiment, topics, and patterns
 */
export const CONTENT_ANALYSIS_TEMPLATE: PromptTemplate = {
  id: "builtin-content-analysis",
  name: "Content Analysis",
  description:
    "Analyze content for sentiment, topics, patterns, and insights. Useful for feedback analysis, trend detection, and content categorization.",
  category: "analysis",
  status: "active",
  version: "1.0.0",

  systemPrompt: `You are an analytical AI for the AIOM platform, specializing in content analysis and insight extraction.

## Analysis Capabilities

1. **Sentiment Analysis**: Determine overall sentiment and emotional tone
2. **Topic Extraction**: Identify main topics and themes
3. **Pattern Recognition**: Detect recurring patterns and trends
4. **Entity Recognition**: Identify key entities mentioned
5. **Category Classification**: Classify content into categories

## Analysis Configuration

{{#if analysisTypes}}
Requested analysis types: {{analysisTypes}}
{{else}}
Perform comprehensive analysis including all capabilities.
{{/if}}

{{#if categories}}
Classification categories:
{{#each categories}}
- {{this}}
{{/each}}
{{/if}}

## Output Format

Return analysis as structured JSON:
{
  "sentiment": {
    "overall": "positive" | "negative" | "neutral" | "mixed",
    "score": -1.0 to 1.0,
    "emotions": ["emotion1", "emotion2"],
    "confidence": 0.0-1.0
  },
  "topics": [
    {"topic": string, "relevance": 0.0-1.0, "keywords": [string]}
  ],
  "categories": [
    {"category": string, "confidence": 0.0-1.0}
  ],
  "entities": [
    {"name": string, "type": string, "mentions": number}
  ],
  "patterns": [
    {"pattern": string, "frequency": number, "significance": string}
  ],
  "insights": [
    {"insight": string, "evidence": string, "actionable": boolean}
  ],
  "summary": string
}

## Domain Context
{{#if domainContext}}
{{domainContext}}
{{/if}}`,

  userPromptPrefix: "Analyze the following content:\n\n---\n",
  userPromptSuffix: "\n---\n\nProvide comprehensive analysis as JSON.",

  variables: [
    {
      name: "analysisTypes",
      description: "Types of analysis to perform",
      type: "array",
      required: false,
      example: ["sentiment", "topics", "entities"],
    },
    {
      name: "categories",
      description: "Categories for classification",
      type: "array",
      required: false,
      example: ["Technical", "Business", "Support", "Feedback"],
    },
    {
      name: "domainContext",
      description: "Domain-specific context for analysis",
      type: "string",
      required: false,
    },
  ],

  caching: {
    enablePromptCaching: true,
    enableMemoryCache: true,
    memoryCacheTTL: 5 * 60 * 1000,
    minTokensForCaching: 1024,
  },

  recommendedModel: "claude-3-5-sonnet-20241022",
  recommendedTemperature: 0.3,
  recommendedMaxTokens: 2048,

  tokenEstimate: {
    baseTokens: 500,
    maxTokens: 1000,
    cacheEligible: false,
  },

  tags: ["analysis", "sentiment", "topics", "patterns", "insights"],
  author: "AIOM System",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Call Summary Template
 * Optimized for summarizing call recordings and transcripts
 */
export const CALL_SUMMARY_TEMPLATE: PromptTemplate = {
  id: "builtin-call-summary",
  name: "Call Summary Generation",
  description:
    "Generate comprehensive summaries of call recordings and transcripts with action items, decisions, and key discussion points.",
  category: "summarization",
  status: "active",
  version: "1.0.0",

  systemPrompt: `You are a professional call summary assistant for the AIOM platform. Your role is to create clear, actionable summaries of business calls.

## Summary Structure

1. **Overview**: Brief 2-3 sentence summary of the call purpose and outcome
2. **Participants**: List of participants and their roles
3. **Key Discussion Points**: Main topics discussed
4. **Decisions Made**: Any decisions reached during the call
5. **Action Items**: Tasks assigned with owners and deadlines
6. **Follow-ups**: Scheduled follow-up meetings or communications
7. **Notes**: Additional relevant observations

## Formatting Guidelines

- Use clear, professional language
- Be concise but comprehensive
- Highlight urgent items
- Note any unresolved issues
- Include relevant quotes when impactful

## Call Context
{{#if callContext}}
- Type: {{callContext.type}}
- Duration: {{callContext.duration}}
- Date: {{callContext.date}}
- Purpose: {{callContext.purpose}}
{{/if}}

## Output Format

Return the summary as structured JSON:
{
  "overview": string,
  "participants": [{"name": string, "role": string}],
  "keyPoints": [{"topic": string, "summary": string, "importance": "high"|"medium"|"low"}],
  "decisions": [{"decision": string, "madeBy": string, "context": string}],
  "actionItems": [{"action": string, "owner": string, "deadline": string, "priority": "high"|"medium"|"low"}],
  "followUps": [{"type": string, "scheduledFor": string, "participants": [string]}],
  "notes": [string],
  "sentiment": "positive"|"neutral"|"negative"|"mixed"
}`,

  userPromptPrefix: "Summarize the following call transcript:\n\n---\n",
  userPromptSuffix: "\n---\n\nProvide a comprehensive summary as JSON.",

  variables: [
    {
      name: "callContext",
      description: "Context about the call",
      type: "object",
      required: false,
      example: {
        type: "Sales Call",
        duration: "45 minutes",
        date: "2024-01-15",
        purpose: "Product demo",
      },
    },
  ],

  caching: {
    enablePromptCaching: true,
    enableMemoryCache: true,
    memoryCacheTTL: 5 * 60 * 1000,
    minTokensForCaching: 1024,
  },

  recommendedModel: "claude-3-5-sonnet-20241022",
  recommendedTemperature: 0.2,
  recommendedMaxTokens: 2048,

  tokenEstimate: {
    baseTokens: 450,
    maxTokens: 700,
    cacheEligible: false,
  },

  tags: ["call", "summary", "transcript", "meeting", "action-items"],
  author: "AIOM System",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// ============================================================================
// Template Registry
// ============================================================================

/**
 * All built-in templates
 */
export const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  BRIEFING_GENERATION_TEMPLATE,
  QUERY_ANSWERING_TEMPLATE,
  SUMMARIZATION_TEMPLATE,
  DATA_EXTRACTION_TEMPLATE,
  CONTENT_ANALYSIS_TEMPLATE,
  CALL_SUMMARY_TEMPLATE,
];

/**
 * Template registry map for quick lookup
 */
export const TEMPLATE_REGISTRY: Map<string, PromptTemplate> = new Map(
  BUILT_IN_TEMPLATES.map((template) => [template.id, template])
);

/**
 * Get a built-in template by ID
 */
export function getBuiltInTemplate(id: string): PromptTemplate | undefined {
  return TEMPLATE_REGISTRY.get(id);
}

/**
 * Get all built-in templates
 */
export function getAllBuiltInTemplates(): PromptTemplate[] {
  return [...BUILT_IN_TEMPLATES];
}

/**
 * Get built-in templates by category
 */
export function getBuiltInTemplatesByCategory(
  category: PromptTemplateCategory
): PromptTemplate[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Search built-in templates
 */
export function searchBuiltInTemplates(
  filters: TemplateSearchFilters
): PromptTemplate[] {
  let results = [...BUILT_IN_TEMPLATES];

  if (filters.category) {
    results = results.filter((t) => t.category === filters.category);
  }

  if (filters.status) {
    results = results.filter((t) => t.status === filters.status);
  }

  if (filters.tags && filters.tags.length > 0) {
    results = results.filter(
      (t) => t.tags && filters.tags!.some((tag) => t.tags!.includes(tag))
    );
  }

  if (filters.query) {
    const query = filters.query.toLowerCase();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    );
  }

  if (filters.cacheEligibleOnly) {
    results = results.filter(
      (t) => t.tokenEstimate?.cacheEligible === true
    );
  }

  return results;
}

/**
 * Convert template to registry entry
 */
export function toRegistryEntry(
  template: PromptTemplate,
  isBuiltIn: boolean = false,
  globalUsageCount: number = 0,
  averageRating?: number
): TemplateRegistryEntry {
  return {
    template,
    isBuiltIn,
    globalUsageCount,
    averageRating,
  };
}
