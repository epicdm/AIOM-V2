
🔧 Tool: Task
Input: {
  "prompt": "Explore the codebase to understand its structure. Look for:\n1. The main project structure and directories\n2. Existing patterns for services, APIs, or similar features\n3. Configuration files (package.json, tsconfig.json, etc.)\n4. Any existing feature flag implementations or similar services\n5. The tech stack being used (framework, testing setup, etc.)\n\nProvide a detailed summary of the codebase structure and any relevant patterns found.",
  "description": "Explore codebase structure",
  "subagent_type": "Explore"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\tsconfig.json"
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\" -maxdepth 2 -type f -name \"*.json\" -o -type d | head -50",
  "description": "List main directories and config files"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\" | head -40",
  "description": "List top-level directory contents"
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\\src\" -maxdepth 2 -type d | sort",
  "description": "List src subdirectories"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\"",
  "description": "List src top-level contents"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\vite.config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\drizzle.config.ts"
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\\src\\lib\" -maxdepth 1 -type d | sort",
  "description": "List all lib services"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\\data-access\" | head -30",
  "description": "List data-access layer"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\config"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\\config\"",
  "description": "List config directory"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\data-access\\feature-flags.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\config\\privateEnv.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\db\\schema.ts",
  "limit": 100
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\\routes\\api\"",
  "description": "List API routes"
}

🔧 Tool: Bash
Input: {
  "command": "grep -n \"featureFlag\\|FeatureFlag\" \"C:\\repos\\AIOM-V2\\src\\db\\schema.ts\" | head -50",
  "description": "Search for feature flag schema"
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\\src\\lib\" -name \"*.ts\" -type f | head -30",
  "description": "List lib services"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\tool-registry\\index.ts",
  "limit": 50
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\\hooks\"",
  "description": "List hooks"
}

🔧 Tool: Bash
Input: {
  "command": "grep -A 30 \"^export const featureFlag = pgTable\" \"C:\\repos\\AIOM-V2\\src\\db\\schema.ts\"",
  "description": "Get feature flag table definition"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\\routes\\api\" | head -30",
  "description": "List API route directories"
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\\src\\lib\\audit-logging-service\" -type f -name \"*.ts\"",
  "description": "List audit logging service files"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\audit-logging-service\\service.ts",
  "limit": 80
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\playwright.config.ts"
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\\src\\routes\\api\" -name \"*.ts\" -type f | head -20",
  "description": "List API endpoints"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\\components\" | grep -E \"^d\"",
  "description": "List component categories"
}

🔧 Tool: Bash
Input: {
  "command": "grep -r \"import.*from.*service\\|import.*Service\" \"C:\\repos\\AIOM-V2\\src\\routes\\api\" | head -20",
  "description": "Check service imports in API routes"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\README.md"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\push-notification\\service.ts",
  "limit": 80
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\\src\\fn\" -type f -name \"*.ts\" | head -20",
  "description": "List fn directory files"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\docs\"",
  "description": "List docs"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\router.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "find \"C:\\repos\\AIOM-V2\\src\\routes\\dashboard\" -type f -name \"*.tsx\" | head -15",
  "description": "List dashboard routes"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\queries"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la \"C:\\repos\\AIOM-V2\\src\\queries\"",
  "description": "List queries directory"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\queries\\accounting.ts",
  "limit": 50
}

🔧 Tool: Bash
Input: {
  "command": "head -100 \"C:\\repos\\AIOM-V2\\src\\data-access\\audit-logging.ts\"",
  "description": "Check audit logging data access"
}

🔧 Tool: Bash
Input: {
  "command": "grep -n \"export.*type.*Roles\\|export.*type.*UserRole\\|export const.*user.*=\\|export type User\" \"C:\\repos\\AIOM-V2\\src\\db\\schema.ts\" | head -20",
  "description": "Find types and exports in schema"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\CLAUDE.md"
}
Excellent! The codebase exploration reveals that there's already a comprehensive feature flag system in place. Let me examine the existing implementation more closely to understand what enhancements might be needed for the feature request.

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\data-access\\feature-flags.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\db\\schema.ts",
  "limit": 500
}
Let me continue reading the schema to find the feature flag definitions:

🔧 Tool: Grep
Input: {
  "pattern": "featureFlag|FeatureFlag",
  "path": "C:\\repos\\AIOM-V2\\src\\db\\schema.ts",
  "output_mode": "content",
  "-n": true
}

🔧 Tool: Glob
Input: {
  "pattern": "src/lib/**/*",
  "path": "C:\\repos\\AIOM-V2"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\db\\schema.ts",
  "offset": 4820,
  "limit": 200
}
Now I have a complete picture. The codebase already has a comprehensive feature flag system with:
- Database schema for feature flags with rollout strategies
- User and role targeting tables
- Data access layer with CRUD operations and flag evaluation logic
- Audit logging integration

However, the feature request mentions "**real-time toggle updates**" which is not currently implemented. This suggests we need to create a **Feature Flag Service** that provides:
1. Real-time toggle updates (via WebSocket or Server-Sent Events)
2. Caching for performance
3. A proper service layer with hooks for easy React integration

Let me explore the existing patterns for services and hooks:

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\audit-logging-service\\service.ts",
  "limit": 150
}

🔧 Tool: Glob
Input: {
  "pattern": "src/hooks/*.ts",
  "path": "C:\\repos\\AIOM-V2"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create Feature Flag Service with caching and real-time updates",
      "status": "in_progress",
      "activeForm": "Creating feature flag service"
    },
    {
      "content": "Create useFeatureFlags React hook for client integration",
      "status": "pending",
      "activeForm": "Creating useFeatureFlags hook"
    },
    {
      "content": "Create server functions for feature flag API",
      "status": "pending",
      "activeForm": "Creating server functions"
    },
    {
      "content": "Create API routes for real-time feature flag updates",
      "status": "pending",
      "activeForm": "Creating API routes"
    },
    {
      "content": "Create Playwright test to verify feature flag service",
      "status": "pending",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and cleanup",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}
Let me examine a hook pattern to understand the conventions:

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\hooks\\useAuditLogs.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "src/fn/*.ts",
  "path": "C:\\repos\\AIOM-V2"
}
There's already a `feature-flags.ts` in the fn directory. Let me check that and the queries folder:

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\fn\\feature-flags.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "src/queries/*.ts",
  "path": "C:\\repos\\AIOM-V2"
}
The codebase already has a comprehensive feature flag system:
1. Database schema with feature flags, user targeting, and role targeting
2. Data access layer with full CRUD and evaluation logic
3. Server functions for admin management and user evaluation

What's missing for the "real-time toggle updates" requirement:
1. **Feature Flag Service** - A service layer with caching and event emission
2. **Query options** for TanStack Query (for consistent caching)
3. **React hooks** for easy client integration
4. **API route** for Server-Sent Events (SSE) for real-time updates

Let me check the queries file pattern:

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\queries\\audit-logs.ts",
  "limit": 100
}
Now let me check the route patterns for API routes:

🔧 Tool: Glob
Input: {
  "pattern": "src/routes/api/**/*",
  "path": "C:\\repos\\AIOM-V2"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\routes\\api\\push\\process-queue.ts"
}
Now I have a comprehensive understanding of the codebase patterns. Let me create the feature flag service with:
1. **Feature Flag Service** - with caching and event emission
2. **Query options** for TanStack Query
3. **React hooks** for client integration
4. **SSE API route** for real-time updates

Let's start implementing:

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\feature-flag-service\\types.ts",
  "content": "/**\n * Feature Flag Service Types\n *\n * Type definitions for the feature flag service including:\n * - Configuration options\n * - Event types for real-time updates\n * - Cache configuration\n * - Service state types\n */\n\nimport type { FeatureFlag, UserRole } from \"~/db/schema\";\n\n// =============================================================================\n// Service Configuration Types\n// =============================================================================\n\n/**\n * Configuration for the Feature Flag Service\n */\nexport interface FeatureFlagServiceConfig {\n  /** Enable caching of flag evaluations */\n  enableCache: boolean;\n  /** Time-to-live for cached evaluations in milliseconds */\n  cacheTTL: number;\n  /** Maximum number of entries in the cache */\n  maxCacheSize: number;\n  /** Enable real-time updates via SSE */\n  enableRealTimeUpdates: boolean;\n  /** Interval for polling flag updates in milliseconds (fallback when SSE unavailable) */\n  pollInterval: number;\n  /** Enable debug logging */\n  debug: boolean;\n}\n\n/**\n * Default service configuration\n */\nexport const DEFAULT_SERVICE_CONFIG: FeatureFlagServiceConfig = {\n  enableCache: true,\n  cacheTTL: 60000, // 1 minute\n  maxCacheSize: 1000,\n  enableRealTimeUpdates: true,\n  pollInterval: 30000, // 30 seconds\n  debug: false,\n};\n\n// =============================================================================\n// Cache Types\n// =============================================================================\n\n/**\n * Cached flag evaluation result\n */\nexport interface CachedFlagEvaluation {\n  flagName: string;\n  enabled: boolean;\n  timestamp: number;\n  expiresAt: number;\n  userId?: string;\n  userRole?: UserRole | null;\n}\n\n/**\n * Cache key builder type\n */\nexport type CacheKeyBuilder = (flagName: string, userId?: string, userRole?: UserRole | null) => string;\n\n// =============================================================================\n// Event Types for Real-Time Updates\n// =============================================================================\n\n/**\n * Feature flag change event types\n */\nexport type FeatureFlagEventType =\n  | \"flag.created\"\n  | \"flag.updated\"\n  | \"flag.deleted\"\n  | \"flag.toggled\"\n  | \"flag.rollout_changed\"\n  | \"flag.user_target_added\"\n  | \"flag.user_target_removed\"\n  | \"flag.role_target_added\"\n  | \"flag.role_target_removed\";\n\n/**\n * Feature flag change event\n */\nexport interface FeatureFlagEvent {\n  type: FeatureFlagEventType;\n  flagId: string;\n  flagName: string;\n  timestamp: number;\n  payload?: {\n    previousState?: Partial<FeatureFlag>;\n    newState?: Partial<FeatureFlag>;\n    userId?: string;\n    role?: UserRole;\n    enabled?: boolean;\n  };\n}\n\n/**\n * Event listener callback type\n */\nexport type FeatureFlagEventListener = (event: FeatureFlagEvent) => void;\n\n// =============================================================================\n// Evaluation Types\n// =============================================================================\n\n/**\n * Flag evaluation context\n */\nexport interface FlagEvaluationContext {\n  userId?: string;\n  userRole?: UserRole | null;\n  attributes?: Record<string, unknown>;\n}\n\n/**\n * Flag evaluation result\n */\nexport interface FlagEvaluationResult {\n  flagName: string;\n  enabled: boolean;\n  reason: FlagEvaluationReason;\n  fromCache: boolean;\n}\n\n/**\n * Reason for flag evaluation result\n */\nexport type FlagEvaluationReason =\n  | \"flag_not_found\"\n  | \"flag_disabled\"\n  | \"user_targeted\"\n  | \"role_targeted\"\n  | \"percentage_rollout\"\n  | \"strategy_all\"\n  | \"strategy_none\"\n  | \"strategy_targeted\"\n  | \"default\";\n\n/**\n * Batch evaluation result\n */\nexport interface BatchEvaluationResult {\n  flags: Record<string, boolean>;\n  evaluations: FlagEvaluationResult[];\n  fromCache: number;\n  freshEvaluations: number;\n}\n\n// =============================================================================\n// Service State Types\n// =============================================================================\n\n/**\n * Service health status\n */\nexport interface ServiceHealthStatus {\n  healthy: boolean;\n  cacheSize: number;\n  cacheHitRate: number;\n  lastUpdate: number | null;\n  connectedClients: number;\n  uptime: number;\n}\n\n/**\n * Cache statistics\n */\nexport interface CacheStats {\n  size: number;\n  hits: number;\n  misses: number;\n  hitRate: number;\n  evictions: number;\n}\n\n// =============================================================================\n// SSE Types\n// =============================================================================\n\n/**\n * SSE client connection\n */\nexport interface SSEClient {\n  id: string;\n  userId: string;\n  userRole?: UserRole | null;\n  connectedAt: number;\n  lastPing: number;\n  send: (event: FeatureFlagEvent) => void;\n  close: () => void;\n}\n\n/**\n * SSE connection options\n */\nexport interface SSEConnectionOptions {\n  userId: string;\n  userRole?: UserRole | null;\n  flagNames?: string[];\n}\n"
}

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\feature-flag-service\\cache.ts",
  "content": "/**\n * Feature Flag Cache\n *\n * LRU-style cache for feature flag evaluations with:\n * - TTL-based expiration\n * - Size-based eviction\n * - Hit/miss statistics\n * - Invalidation by flag name or user\n */\n\nimport type {\n  CachedFlagEvaluation,\n  CacheStats,\n  CacheKeyBuilder,\n} from \"./types\";\nimport type { UserRole } from \"~/db/schema\";\n\n// =============================================================================\n// Cache Key Utilities\n// =============================================================================\n\n/**\n * Build a cache key from flag name, user ID, and role\n */\nexport const buildCacheKey: CacheKeyBuilder = (\n  flagName: string,\n  userId?: string,\n  userRole?: UserRole | null\n): string => {\n  const parts = [flagName];\n  if (userId) parts.push(`u:${userId}`);\n  if (userRole) parts.push(`r:${userRole}`);\n  return parts.join(\":\");\n};\n\n// =============================================================================\n// Feature Flag Cache Class\n// =============================================================================\n\nexport class FeatureFlagCache {\n  private cache: Map<string, CachedFlagEvaluation> = new Map();\n  private accessOrder: string[] = [];\n  private maxSize: number;\n  private defaultTTL: number;\n  private hits: number = 0;\n  private misses: number = 0;\n  private evictions: number = 0;\n\n  constructor(maxSize: number = 1000, defaultTTL: number = 60000) {\n    this.maxSize = maxSize;\n    this.defaultTTL = defaultTTL;\n  }\n\n  /**\n   * Get a cached evaluation\n   */\n  get(\n    flagName: string,\n    userId?: string,\n    userRole?: UserRole | null\n  ): CachedFlagEvaluation | null {\n    const key = buildCacheKey(flagName, userId, userRole);\n    const entry = this.cache.get(key);\n\n    if (!entry) {\n      this.misses++;\n      return null;\n    }\n\n    // Check if entry has expired\n    if (Date.now() > entry.expiresAt) {\n      this.cache.delete(key);\n      this.removeFromAccessOrder(key);\n      this.misses++;\n      return null;\n    }\n\n    // Move to end of access order (most recently used)\n    this.updateAccessOrder(key);\n    this.hits++;\n\n    return entry;\n  }\n\n  /**\n   * Set a cached evaluation\n   */\n  set(\n    flagName: string,\n    enabled: boolean,\n    userId?: string,\n    userRole?: UserRole | null,\n    ttl?: number\n  ): void {\n    const key = buildCacheKey(flagName, userId, userRole);\n    const now = Date.now();\n    const actualTTL = ttl ?? this.defaultTTL;\n\n    // Evict entries if at max size\n    while (this.cache.size >= this.maxSize) {\n      this.evictOldest();\n    }\n\n    const entry: CachedFlagEvaluation = {\n      flagName,\n      enabled,\n      timestamp: now,\n      expiresAt: now + actualTTL,\n      userId,\n      userRole,\n    };\n\n    this.cache.set(key, entry);\n    this.updateAccessOrder(key);\n  }\n\n  /**\n   * Invalidate cache entries for a specific flag\n   */\n  invalidateFlag(flagName: string): number {\n    let invalidated = 0;\n\n    for (const [key, entry] of this.cache.entries()) {\n      if (entry.flagName === flagName) {\n        this.cache.delete(key);\n        this.removeFromAccessOrder(key);\n        invalidated++;\n      }\n    }\n\n    return invalidated;\n  }\n\n  /**\n   * Invalidate cache entries for a specific user\n   */\n  invalidateUser(userId: string): number {\n    let invalidated = 0;\n\n    for (const [key, entry] of this.cache.entries()) {\n      if (entry.userId === userId) {\n        this.cache.delete(key);\n        this.removeFromAccessOrder(key);\n        invalidated++;\n      }\n    }\n\n    return invalidated;\n  }\n\n  /**\n   * Invalidate cache entries for a specific role\n   */\n  invalidateRole(role: UserRole): number {\n    let invalidated = 0;\n\n    for (const [key, entry] of this.cache.entries()) {\n      if (entry.userRole === role) {\n        this.cache.delete(key);\n        this.removeFromAccessOrder(key);\n        invalidated++;\n      }\n    }\n\n    return invalidated;\n  }\n\n  /**\n   * Clear all cache entries\n   */\n  clear(): void {\n    this.cache.clear();\n    this.accessOrder = [];\n  }\n\n  /**\n   * Get cache statistics\n   */\n  getStats(): CacheStats {\n    const total = this.hits + this.misses;\n    return {\n      size: this.cache.size,\n      hits: this.hits,\n      misses: this.misses,\n      hitRate: total > 0 ? this.hits / total : 0,\n      evictions: this.evictions,\n    };\n  }\n\n  /**\n   * Reset statistics\n   */\n  resetStats(): void {\n    this.hits = 0;\n    this.misses = 0;\n    this.evictions = 0;\n  }\n\n  /**\n   * Clean up expired entries\n   */\n  cleanup(): number {\n    const now = Date.now();\n    let cleaned = 0;\n\n    for (const [key, entry] of this.cache.entries()) {\n      if (now > entry.expiresAt) {\n        this.cache.delete(key);\n        this.removeFromAccessOrder(key);\n        cleaned++;\n      }\n    }\n\n    return cleaned;\n  }\n\n  /**\n   * Get cache size\n   */\n  get size(): number {\n    return this.cache.size;\n  }\n\n  // ==========================================================================\n  // Private Methods\n  // ==========================================================================\n\n  private evictOldest(): void {\n    if (this.accessOrder.length === 0) return;\n\n    const oldestKey = this.accessOrder.shift();\n    if (oldestKey) {\n      this.cache.delete(oldestKey);\n      this.evictions++;\n    }\n  }\n\n  private updateAccessOrder(key: string): void {\n    this.removeFromAccessOrder(key);\n    this.accessOrder.push(key);\n  }\n\n  private removeFromAccessOrder(key: string): void {\n    const index = this.accessOrder.indexOf(key);\n    if (index > -1) {\n      this.accessOrder.splice(index, 1);\n    }\n  }\n}\n\n// =============================================================================\n// Singleton Instance\n// =============================================================================\n\nlet cacheInstance: FeatureFlagCache | null = null;\n\n/**\n * Get the singleton cache instance\n */\nexport function getFeatureFlagCache(\n  maxSize?: number,\n  defaultTTL?: number\n): FeatureFlagCache {\n  if (!cacheInstance) {\n    cacheInstance = new FeatureFlagCache(maxSize, defaultTTL);\n  }\n  return cacheInstance;\n}\n\n/**\n * Reset the singleton cache instance (mainly for testing)\n */\nexport function resetFeatureFlagCache(): void {\n  if (cacheInstance) {\n    cacheInstance.clear();\n    cacheInstance.resetStats();\n  }\n  cacheInstance = null;\n}\n"
}

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\feature-flag-service\\event-emitter.ts",
  "content": "/**\n * Feature Flag Event Emitter\n *\n * Event-driven architecture for real-time feature flag updates:\n * - Pub/sub pattern for flag change events\n * - Support for SSE client connections\n * - Event filtering by flag name or user\n */\n\nimport type {\n  FeatureFlagEvent,\n  FeatureFlagEventType,\n  FeatureFlagEventListener,\n  SSEClient,\n} from \"./types\";\nimport type { FeatureFlag, UserRole } from \"~/db/schema\";\nimport { nanoid } from \"nanoid\";\n\n// =============================================================================\n// Event Emitter Class\n// =============================================================================\n\nexport class FeatureFlagEventEmitter {\n  private listeners: Map<string, Set<FeatureFlagEventListener>> = new Map();\n  private globalListeners: Set<FeatureFlagEventListener> = new Set();\n  private sseClients: Map<string, SSEClient> = new Map();\n  private eventHistory: FeatureFlagEvent[] = [];\n  private maxHistorySize: number = 100;\n\n  // ==========================================================================\n  // Event Subscription\n  // ==========================================================================\n\n  /**\n   * Subscribe to all feature flag events\n   */\n  onAny(listener: FeatureFlagEventListener): () => void {\n    this.globalListeners.add(listener);\n    return () => {\n      this.globalListeners.delete(listener);\n    };\n  }\n\n  /**\n   * Subscribe to events for a specific flag\n   */\n  onFlag(flagName: string, listener: FeatureFlagEventListener): () => void {\n    if (!this.listeners.has(flagName)) {\n      this.listeners.set(flagName, new Set());\n    }\n    this.listeners.get(flagName)!.add(listener);\n\n    return () => {\n      const flagListeners = this.listeners.get(flagName);\n      if (flagListeners) {\n        flagListeners.delete(listener);\n        if (flagListeners.size === 0) {\n          this.listeners.delete(flagName);\n        }\n      }\n    };\n  }\n\n  /**\n   * Subscribe to specific event types\n   */\n  on(\n    eventType: FeatureFlagEventType,\n    listener: FeatureFlagEventListener\n  ): () => void {\n    const wrappedListener: FeatureFlagEventListener = (event) => {\n      if (event.type === eventType) {\n        listener(event);\n      }\n    };\n    this.globalListeners.add(wrappedListener);\n\n    return () => {\n      this.globalListeners.delete(wrappedListener);\n    };\n  }\n\n  // ==========================================================================\n  // Event Emission\n  // ==========================================================================\n\n  /**\n   * Emit a feature flag event\n   */\n  emit(event: FeatureFlagEvent): void {\n    // Add to history\n    this.addToHistory(event);\n\n    // Notify global listeners\n    for (const listener of this.globalListeners) {\n      try {\n        listener(event);\n      } catch (error) {\n        console.error(\"Error in feature flag event listener:\", error);\n      }\n    }\n\n    // Notify flag-specific listeners\n    const flagListeners = this.listeners.get(event.flagName);\n    if (flagListeners) {\n      for (const listener of flagListeners) {\n        try {\n          listener(event);\n        } catch (error) {\n          console.error(`Error in feature flag listener for ${event.flagName}:`, error);\n        }\n      }\n    }\n\n    // Notify SSE clients\n    this.broadcastToSSEClients(event);\n  }\n\n  /**\n   * Emit a flag created event\n   */\n  emitFlagCreated(flag: FeatureFlag): void {\n    this.emit({\n      type: \"flag.created\",\n      flagId: flag.id,\n      flagName: flag.flagName,\n      timestamp: Date.now(),\n      payload: { newState: flag },\n    });\n  }\n\n  /**\n   * Emit a flag updated event\n   */\n  emitFlagUpdated(\n    flag: FeatureFlag,\n    previousState?: Partial<FeatureFlag>\n  ): void {\n    this.emit({\n      type: \"flag.updated\",\n      flagId: flag.id,\n      flagName: flag.flagName,\n      timestamp: Date.now(),\n      payload: { previousState, newState: flag },\n    });\n  }\n\n  /**\n   * Emit a flag deleted event\n   */\n  emitFlagDeleted(flagId: string, flagName: string): void {\n    this.emit({\n      type: \"flag.deleted\",\n      flagId,\n      flagName,\n      timestamp: Date.now(),\n    });\n  }\n\n  /**\n   * Emit a flag toggled event\n   */\n  emitFlagToggled(flag: FeatureFlag, previousEnabled: boolean): void {\n    this.emit({\n      type: \"flag.toggled\",\n      flagId: flag.id,\n      flagName: flag.flagName,\n      timestamp: Date.now(),\n      payload: {\n        previousState: { enabled: previousEnabled },\n        newState: { enabled: flag.enabled },\n        enabled: flag.enabled,\n      },\n    });\n  }\n\n  /**\n   * Emit a rollout percentage changed event\n   */\n  emitRolloutChanged(\n    flag: FeatureFlag,\n    previousPercentage: number\n  ): void {\n    this.emit({\n      type: \"flag.rollout_changed\",\n      flagId: flag.id,\n      flagName: flag.flagName,\n      timestamp: Date.now(),\n      payload: {\n        previousState: { rolloutPercentage: previousPercentage },\n        newState: { rolloutPercentage: flag.rolloutPercentage },\n      },\n    });\n  }\n\n  /**\n   * Emit a user target added event\n   */\n  emitUserTargetAdded(\n    flagId: string,\n    flagName: string,\n    userId: string,\n    enabled: boolean\n  ): void {\n    this.emit({\n      type: \"flag.user_target_added\",\n      flagId,\n      flagName,\n      timestamp: Date.now(),\n      payload: { userId, enabled },\n    });\n  }\n\n  /**\n   * Emit a user target removed event\n   */\n  emitUserTargetRemoved(\n    flagId: string,\n    flagName: string,\n    userId: string\n  ): void {\n    this.emit({\n      type: \"flag.user_target_removed\",\n      flagId,\n      flagName,\n      timestamp: Date.now(),\n      payload: { userId },\n    });\n  }\n\n  /**\n   * Emit a role target added event\n   */\n  emitRoleTargetAdded(\n    flagId: string,\n    flagName: string,\n    role: UserRole,\n    enabled: boolean\n  ): void {\n    this.emit({\n      type: \"flag.role_target_added\",\n      flagId,\n      flagName,\n      timestamp: Date.now(),\n      payload: { role, enabled },\n    });\n  }\n\n  /**\n   * Emit a role target removed event\n   */\n  emitRoleTargetRemoved(\n    flagId: string,\n    flagName: string,\n    role: UserRole\n  ): void {\n    this.emit({\n      type: \"flag.role_target_removed\",\n      flagId,\n      flagName,\n      timestamp: Date.now(),\n      payload: { role },\n    });\n  }\n\n  // ==========================================================================\n  // SSE Client Management\n  // ==========================================================================\n\n  /**\n   * Register an SSE client\n   */\n  registerSSEClient(\n    userId: string,\n    userRole: UserRole | null | undefined,\n    sendFn: (event: FeatureFlagEvent) => void,\n    closeFn: () => void\n  ): SSEClient {\n    const client: SSEClient = {\n      id: nanoid(),\n      userId,\n      userRole,\n      connectedAt: Date.now(),\n      lastPing: Date.now(),\n      send: sendFn,\n      close: closeFn,\n    };\n\n    this.sseClients.set(client.id, client);\n    return client;\n  }\n\n  /**\n   * Unregister an SSE client\n   */\n  unregisterSSEClient(clientId: string): void {\n    const client = this.sseClients.get(clientId);\n    if (client) {\n      try {\n        client.close();\n      } catch {\n        // Ignore close errors\n      }\n      this.sseClients.delete(clientId);\n    }\n  }\n\n  /**\n   * Update client ping time\n   */\n  pingClient(clientId: string): void {\n    const client = this.sseClients.get(clientId);\n    if (client) {\n      client.lastPing = Date.now();\n    }\n  }\n\n  /**\n   * Get connected client count\n   */\n  getConnectedClientCount(): number {\n    return this.sseClients.size;\n  }\n\n  /**\n   * Broadcast event to all SSE clients\n   */\n  private broadcastToSSEClients(event: FeatureFlagEvent): void {\n    for (const client of this.sseClients.values()) {\n      try {\n        client.send(event);\n      } catch (error) {\n        console.error(`Error sending event to SSE client ${client.id}:`, error);\n        // Remove disconnected client\n        this.sseClients.delete(client.id);\n      }\n    }\n  }\n\n  /**\n   * Clean up stale SSE connections\n   */\n  cleanupStaleConnections(maxAge: number = 300000): number {\n    const now = Date.now();\n    let cleaned = 0;\n\n    for (const [clientId, client] of this.sseClients.entries()) {\n      if (now - client.lastPing > maxAge) {\n        this.unregisterSSEClient(clientId);\n        cleaned++;\n      }\n    }\n\n    return cleaned;\n  }\n\n  // ==========================================================================\n  // Event History\n  // ==========================================================================\n\n  /**\n   * Get recent event history\n   */\n  getHistory(limit?: number): FeatureFlagEvent[] {\n    const maxLimit = limit ?? this.maxHistorySize;\n    return this.eventHistory.slice(-maxLimit);\n  }\n\n  /**\n   * Get events since a timestamp\n   */\n  getEventsSince(timestamp: number): FeatureFlagEvent[] {\n    return this.eventHistory.filter((e) => e.timestamp > timestamp);\n  }\n\n  /**\n   * Add event to history\n   */\n  private addToHistory(event: FeatureFlagEvent): void {\n    this.eventHistory.push(event);\n\n    // Trim history if needed\n    if (this.eventHistory.length > this.maxHistorySize) {\n      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);\n    }\n  }\n\n  /**\n   * Clear event history\n   */\n  clearHistory(): void {\n    this.eventHistory = [];\n  }\n\n  // ==========================================================================\n  // Cleanup\n  // ==========================================================================\n\n  /**\n   * Remove all listeners and clients\n   */\n  dispose(): void {\n    this.listeners.clear();\n    this.globalListeners.clear();\n\n    for (const client of this.sseClients.values()) {\n      try {\n        client.close();\n      } catch {\n        // Ignore close errors\n      }\n    }\n    this.sseClients.clear();\n    this.eventHistory = [];\n  }\n}\n\n// =============================================================================\n// Singleton Instance\n// =============================================================================\n\nlet emitterInstance: FeatureFlagEventEmitter | null = null;\n\n/**\n * Get the singleton event emitter instance\n */\nexport function getFeatureFlagEventEmitter(): FeatureFlagEventEmitter {\n  if (!emitterInstance) {\n    emitterInstance = new FeatureFlagEventEmitter();\n  }\n  return emitterInstance;\n}\n\n/**\n * Reset the singleton instance (mainly for testing)\n */\nexport function resetFeatureFlagEventEmitter(): void {\n  if (emitterInstance) {\n    emitterInstance.dispose();\n  }\n  emitterInstance = null;\n}\n"
}

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\feature-flag-service\\service.ts",
  "content": "/**\n * Feature Flag Service\n *\n * Main service for feature flag evaluation with:\n * - Caching for performance\n * - Real-time event emission\n * - Batch evaluation support\n * - Health monitoring\n */\n\nimport type {\n  FeatureFlagServiceConfig,\n  FlagEvaluationContext,\n  FlagEvaluationResult,\n  FlagEvaluationReason,\n  BatchEvaluationResult,\n  ServiceHealthStatus,\n  FeatureFlagEvent,\n  FeatureFlagEventListener,\n} from \"./types\";\nimport { DEFAULT_SERVICE_CONFIG } from \"./types\";\nimport { FeatureFlagCache, getFeatureFlagCache } from \"./cache\";\nimport { FeatureFlagEventEmitter, getFeatureFlagEventEmitter } from \"./event-emitter\";\nimport {\n  findFeatureFlagByName,\n  getFeatureFlagUserTarget,\n  getFeatureFlagRoleTarget,\n  isFeatureFlagEnabled,\n  checkMultipleFeatureFlags,\n  createFeatureFlag,\n  updateFeatureFlag,\n  deleteFeatureFlag,\n  addFeatureFlagUserTarget,\n  removeFeatureFlagUserTarget,\n  addFeatureFlagRoleTarget,\n  removeFeatureFlagRoleTarget,\n} from \"~/data-access/feature-flags\";\nimport type { FeatureFlag, UserRole, CreateFeatureFlagData, UpdateFeatureFlagData } from \"~/db/schema\";\nimport type { AuditActorType } from \"~/data-access/audit-logging\";\n\n// =============================================================================\n// Feature Flag Service Class\n// =============================================================================\n\nexport class FeatureFlagService {\n  private config: FeatureFlagServiceConfig;\n  private cache: FeatureFlagCache;\n  private eventEmitter: FeatureFlagEventEmitter;\n  private startTime: number;\n  private cleanupInterval: NodeJS.Timeout | null = null;\n\n  constructor(config: Partial<FeatureFlagServiceConfig> = {}) {\n    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };\n    this.cache = getFeatureFlagCache(this.config.maxCacheSize, this.config.cacheTTL);\n    this.eventEmitter = getFeatureFlagEventEmitter();\n    this.startTime = Date.now();\n\n    // Start periodic cache cleanup\n    if (this.config.enableCache) {\n      this.startCacheCleanup();\n    }\n  }\n\n  // ==========================================================================\n  // Configuration\n  // ==========================================================================\n\n  /**\n   * Update service configuration\n   */\n  updateConfig(config: Partial<FeatureFlagServiceConfig>): void {\n    this.config = { ...this.config, ...config };\n\n    if (this.config.debug) {\n      console.log(\"[FeatureFlagService] Config updated:\", this.config);\n    }\n  }\n\n  /**\n   * Get current configuration\n   */\n  getConfig(): FeatureFlagServiceConfig {\n    return { ...this.config };\n  }\n\n  // ==========================================================================\n  // Flag Evaluation\n  // ==========================================================================\n\n  /**\n   * Check if a feature flag is enabled\n   */\n  async isEnabled(\n    flagName: string,\n    context?: FlagEvaluationContext\n  ): Promise<boolean> {\n    const result = await this.evaluate(flagName, context);\n    return result.enabled;\n  }\n\n  /**\n   * Evaluate a feature flag with full result\n   */\n  async evaluate(\n    flagName: string,\n    context?: FlagEvaluationContext\n  ): Promise<FlagEvaluationResult> {\n    const userId = context?.userId;\n    const userRole = context?.userRole;\n\n    // Check cache first\n    if (this.config.enableCache) {\n      const cached = this.cache.get(flagName, userId, userRole);\n      if (cached) {\n        if (this.config.debug) {\n          console.log(`[FeatureFlagService] Cache hit for ${flagName}`);\n        }\n        return {\n          flagName,\n          enabled: cached.enabled,\n          reason: \"default\",\n          fromCache: true,\n        };\n      }\n    }\n\n    // Evaluate flag\n    const result = await this.evaluateWithReason(flagName, userId, userRole);\n\n    // Cache result\n    if (this.config.enableCache) {\n      this.cache.set(flagName, result.enabled, userId, userRole);\n    }\n\n    if (this.config.debug) {\n      console.log(`[FeatureFlagService] Evaluated ${flagName}:`, result);\n    }\n\n    return {\n      ...result,\n      fromCache: false,\n    };\n  }\n\n  /**\n   * Evaluate multiple flags at once\n   */\n  async evaluateMultiple(\n    flagNames: string[],\n    context?: FlagEvaluationContext\n  ): Promise<BatchEvaluationResult> {\n    const results: FlagEvaluationResult[] = [];\n    const flags: Record<string, boolean> = {};\n    let fromCache = 0;\n    let freshEvaluations = 0;\n\n    await Promise.all(\n      flagNames.map(async (flagName) => {\n        const result = await this.evaluate(flagName, context);\n        results.push(result);\n        flags[flagName] = result.enabled;\n\n        if (result.fromCache) {\n          fromCache++;\n        } else {\n          freshEvaluations++;\n        }\n      })\n    );\n\n    return {\n      flags,\n      evaluations: results,\n      fromCache,\n      freshEvaluations,\n    };\n  }\n\n  /**\n   * Get all enabled flags for a context\n   */\n  async getEnabledFlags(\n    flagNames: string[],\n    context?: FlagEvaluationContext\n  ): Promise<string[]> {\n    const result = await this.evaluateMultiple(flagNames, context);\n    return Object.entries(result.flags)\n      .filter(([, enabled]) => enabled)\n      .map(([name]) => name);\n  }\n\n  // ==========================================================================\n  // Flag Management (with event emission)\n  // ==========================================================================\n\n  /**\n   * Create a new feature flag\n   */\n  async createFlag(\n    data: CreateFeatureFlagData,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<FeatureFlag> {\n    const flag = await createFeatureFlag(data, actorInfo);\n    this.eventEmitter.emitFlagCreated(flag);\n    return flag;\n  }\n\n  /**\n   * Update a feature flag\n   */\n  async updateFlag(\n    id: string,\n    data: UpdateFeatureFlagData,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<FeatureFlag | null> {\n    // Get previous state for event\n    const previousFlag = await this.getFlagById(id);\n    const previousState = previousFlag ? { ...previousFlag } : undefined;\n\n    const flag = await updateFeatureFlag(id, data, actorInfo);\n\n    if (flag) {\n      // Invalidate cache for this flag\n      this.cache.invalidateFlag(flag.flagName);\n\n      // Emit appropriate events\n      if (previousState && data.enabled !== undefined && data.enabled !== previousState.enabled) {\n        this.eventEmitter.emitFlagToggled(flag, previousState.enabled);\n      } else if (\n        previousState &&\n        data.rolloutPercentage !== undefined &&\n        data.rolloutPercentage !== previousState.rolloutPercentage\n      ) {\n        this.eventEmitter.emitRolloutChanged(flag, previousState.rolloutPercentage);\n      } else {\n        this.eventEmitter.emitFlagUpdated(flag, previousState);\n      }\n    }\n\n    return flag;\n  }\n\n  /**\n   * Delete a feature flag\n   */\n  async deleteFlag(\n    id: string,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<boolean> {\n    // Get flag info before deletion\n    const flag = await this.getFlagById(id);\n    if (!flag) return false;\n\n    const success = await deleteFeatureFlag(id, actorInfo);\n\n    if (success) {\n      // Invalidate cache\n      this.cache.invalidateFlag(flag.flagName);\n      // Emit event\n      this.eventEmitter.emitFlagDeleted(id, flag.flagName);\n    }\n\n    return success;\n  }\n\n  /**\n   * Toggle a feature flag\n   */\n  async toggleFlag(\n    id: string,\n    enabled: boolean,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<FeatureFlag | null> {\n    return this.updateFlag(id, { enabled }, actorInfo);\n  }\n\n  /**\n   * Update rollout percentage\n   */\n  async updateRollout(\n    id: string,\n    rolloutPercentage: number,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<FeatureFlag | null> {\n    return this.updateFlag(id, { rolloutPercentage }, actorInfo);\n  }\n\n  // ==========================================================================\n  // User Targeting\n  // ==========================================================================\n\n  /**\n   * Add user target\n   */\n  async addUserTarget(\n    featureFlagId: string,\n    userId: string,\n    enabled: boolean,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<void> {\n    const flag = await this.getFlagById(featureFlagId);\n    if (!flag) throw new Error(\"Feature flag not found\");\n\n    await addFeatureFlagUserTarget(\n      {\n        id: crypto.randomUUID(),\n        featureFlagId,\n        userId,\n        enabled,\n      },\n      actorInfo\n    );\n\n    // Invalidate user's cache\n    this.cache.invalidateUser(userId);\n\n    // Emit event\n    this.eventEmitter.emitUserTargetAdded(featureFlagId, flag.flagName, userId, enabled);\n  }\n\n  /**\n   * Remove user target\n   */\n  async removeUserTarget(\n    featureFlagId: string,\n    userId: string,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<boolean> {\n    const flag = await this.getFlagById(featureFlagId);\n    if (!flag) return false;\n\n    const success = await removeFeatureFlagUserTarget(featureFlagId, userId, actorInfo);\n\n    if (success) {\n      // Invalidate user's cache\n      this.cache.invalidateUser(userId);\n\n      // Emit event\n      this.eventEmitter.emitUserTargetRemoved(featureFlagId, flag.flagName, userId);\n    }\n\n    return success;\n  }\n\n  // ==========================================================================\n  // Role Targeting\n  // ==========================================================================\n\n  /**\n   * Add role target\n   */\n  async addRoleTarget(\n    featureFlagId: string,\n    role: UserRole,\n    enabled: boolean,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<void> {\n    const flag = await this.getFlagById(featureFlagId);\n    if (!flag) throw new Error(\"Feature flag not found\");\n\n    await addFeatureFlagRoleTarget(\n      {\n        id: crypto.randomUUID(),\n        featureFlagId,\n        role,\n        enabled,\n      },\n      actorInfo\n    );\n\n    // Invalidate role's cache\n    this.cache.invalidateRole(role);\n\n    // Emit event\n    this.eventEmitter.emitRoleTargetAdded(featureFlagId, flag.flagName, role, enabled);\n  }\n\n  /**\n   * Remove role target\n   */\n  async removeRoleTarget(\n    featureFlagId: string,\n    role: UserRole,\n    actorInfo?: {\n      actorId: string;\n      actorType: AuditActorType;\n      actorName?: string;\n      actorEmail?: string;\n    }\n  ): Promise<boolean> {\n    const flag = await this.getFlagById(featureFlagId);\n    if (!flag) return false;\n\n    const success = await removeFeatureFlagRoleTarget(featureFlagId, role, actorInfo);\n\n    if (success) {\n      // Invalidate role's cache\n      this.cache.invalidateRole(role);\n\n      // Emit event\n      this.eventEmitter.emitRoleTargetRemoved(featureFlagId, flag.flagName, role);\n    }\n\n    return success;\n  }\n\n  // ==========================================================================\n  // Event Subscription\n  // ==========================================================================\n\n  /**\n   * Subscribe to all flag events\n   */\n  onAny(listener: FeatureFlagEventListener): () => void {\n    return this.eventEmitter.onAny(listener);\n  }\n\n  /**\n   * Subscribe to events for a specific flag\n   */\n  onFlag(flagName: string, listener: FeatureFlagEventListener): () => void {\n    return this.eventEmitter.onFlag(flagName, listener);\n  }\n\n  /**\n   * Get event emitter for SSE registration\n   */\n  getEventEmitter(): FeatureFlagEventEmitter {\n    return this.eventEmitter;\n  }\n\n  // ==========================================================================\n  // Health & Monitoring\n  // ==========================================================================\n\n  /**\n   * Get service health status\n   */\n  getHealthStatus(): ServiceHealthStatus {\n    const cacheStats = this.cache.getStats();\n    return {\n      healthy: true,\n      cacheSize: cacheStats.size,\n      cacheHitRate: cacheStats.hitRate,\n      lastUpdate: null,\n      connectedClients: this.eventEmitter.getConnectedClientCount(),\n      uptime: Date.now() - this.startTime,\n    };\n  }\n\n  /**\n   * Get cache statistics\n   */\n  getCacheStats() {\n    return this.cache.getStats();\n  }\n\n  /**\n   * Clear cache\n   */\n  clearCache(): void {\n    this.cache.clear();\n  }\n\n  /**\n   * Invalidate cache for a flag\n   */\n  invalidateCache(flagName: string): number {\n    return this.cache.invalidateFlag(flagName);\n  }\n\n  // ==========================================================================\n  // Private Methods\n  // ==========================================================================\n\n  private async getFlagById(id: string): Promise<FeatureFlag | null> {\n    const { findFeatureFlagById } = await import(\"~/data-access/feature-flags\");\n    return findFeatureFlagById(id);\n  }\n\n  private async evaluateWithReason(\n    flagName: string,\n    userId?: string,\n    userRole?: UserRole | null\n  ): Promise<Omit<FlagEvaluationResult, \"fromCache\">> {\n    // Get the flag\n    const flag = await findFeatureFlagByName(flagName);\n    if (!flag) {\n      return { flagName, enabled: false, reason: \"flag_not_found\" };\n    }\n\n    // If globally disabled and strategy is not \"targeted\", return false\n    if (!flag.enabled && flag.rolloutStrategy !== \"targeted\") {\n      return { flagName, enabled: false, reason: \"flag_disabled\" };\n    }\n\n    // If user is provided, check explicit user targeting first\n    if (userId) {\n      const userTarget = await getFeatureFlagUserTarget(flag.id, userId);\n      if (userTarget) {\n        return {\n          flagName,\n          enabled: userTarget.enabled,\n          reason: \"user_targeted\",\n        };\n      }\n    }\n\n    // Check role targeting\n    if (userRole) {\n      const roleTarget = await getFeatureFlagRoleTarget(flag.id, userRole);\n      if (roleTarget) {\n        return {\n          flagName,\n          enabled: roleTarget.enabled,\n          reason: \"role_targeted\",\n        };\n      }\n    }\n\n    // Apply rollout strategy\n    switch (flag.rolloutStrategy) {\n      case \"all\":\n        return { flagName, enabled: flag.enabled, reason: \"strategy_all\" };\n\n      case \"none\":\n        return { flagName, enabled: false, reason: \"strategy_none\" };\n\n      case \"targeted\":\n        return { flagName, enabled: false, reason: \"strategy_targeted\" };\n\n      case \"percentage\":\n        if (!userId) {\n          return { flagName, enabled: flag.enabled, reason: \"default\" };\n        }\n        const userHash = this.hashUserForRollout(userId, flagName);\n        const enabled = userHash < flag.rolloutPercentage;\n        return { flagName, enabled, reason: \"percentage_rollout\" };\n\n      default:\n        return { flagName, enabled: flag.enabled, reason: \"default\" };\n    }\n  }\n\n  private hashUserForRollout(userId: string, flagName: string): number {\n    const combined = `${userId}:${flagName}`;\n    let hash = 0;\n    for (let i = 0; i < combined.length; i++) {\n      const char = combined.charCodeAt(i);\n      hash = (hash << 5) - hash + char;\n      hash = hash & hash;\n    }\n    return Math.abs(hash) % 100;\n  }\n\n  private startCacheCleanup(): void {\n    // Clean up every minute\n    this.cleanupInterval = setInterval(() => {\n      const cleaned = this.cache.cleanup();\n      if (this.config.debug && cleaned > 0) {\n        console.log(`[FeatureFlagService] Cleaned ${cleaned} expired cache entries`);\n      }\n\n      // Also clean up stale SSE connections\n      const staleConnections = this.eventEmitter.cleanupStaleConnections();\n      if (this.config.debug && staleConnections > 0) {\n        console.log(`[FeatureFlagService] Cleaned ${staleConnections} stale SSE connections`);\n      }\n    }, 60000);\n  }\n\n  /**\n   * Dispose service resources\n   */\n  dispose(): void {\n    if (this.cleanupInterval) {\n      clearInterval(this.cleanupInterval);\n      this.cleanupInterval = null;\n    }\n  }\n}\n\n// =============================================================================\n// Singleton Instance\n// =============================================================================\n\nlet serviceInstance: FeatureFlagService | null = null;\n\n/**\n * Get the singleton service instance\n */\nexport function getFeatureFlagService(\n  config?: Partial<FeatureFlagServiceConfig>\n): FeatureFlagService {\n  if (!serviceInstance) {\n    serviceInstance = new FeatureFlagService(config);\n  }\n  return serviceInstance;\n}\n\n/**\n * Reset the singleton instance (mainly for testing)\n */\nexport function resetFeatureFlagService(): void {\n  if (serviceInstance) {\n    serviceInstance.dispose();\n  }\n  serviceInstance = null;\n}\n"
}

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\feature-flag-service\\index.ts",
  "content": "/**\n * Feature Flag Service\n *\n * A comprehensive feature flag service for gradual rollout and A/B testing\n * with user targeting and real-time toggle updates.\n *\n * Features:\n * - Gradual rollout with percentage-based targeting\n * - User and role-based targeting\n * - Caching for performance\n * - Real-time updates via Server-Sent Events (SSE)\n * - Event-driven architecture for flag changes\n * - A/B testing support\n *\n * @example\n * ```typescript\n * import { getFeatureFlagService } from \"~/lib/feature-flag-service\";\n *\n * const service = getFeatureFlagService();\n *\n * // Check if a feature is enabled\n * const isEnabled = await service.isEnabled(\"new_dashboard\", {\n *   userId: \"user-123\",\n *   userRole: \"admin\",\n * });\n *\n * // Subscribe to flag changes\n * const unsubscribe = service.onFlag(\"new_dashboard\", (event) => {\n *   console.log(\"Flag changed:\", event);\n * });\n * ```\n */\n\n// =============================================================================\n// Main Service Export\n// =============================================================================\n\nexport {\n  FeatureFlagService,\n  getFeatureFlagService,\n  resetFeatureFlagService,\n} from \"./service\";\n\n// =============================================================================\n// Cache Export\n// =============================================================================\n\nexport {\n  FeatureFlagCache,\n  getFeatureFlagCache,\n  resetFeatureFlagCache,\n  buildCacheKey,\n} from \"./cache\";\n\n// =============================================================================\n// Event Emitter Export\n// =============================================================================\n\nexport {\n  FeatureFlagEventEmitter,\n  getFeatureFlagEventEmitter,\n  resetFeatureFlagEventEmitter,\n} from \"./event-emitter\";\n\n// =============================================================================\n// Type Exports\n// =============================================================================\n\nexport type {\n  // Configuration\n  FeatureFlagServiceConfig,\n  // Cache\n  CachedFlagEvaluation,\n  CacheKeyBuilder,\n  CacheStats,\n  // Events\n  FeatureFlagEventType,\n  FeatureFlagEvent,\n  FeatureFlagEventListener,\n  // Evaluation\n  FlagEvaluationContext,\n  FlagEvaluationResult,\n  FlagEvaluationReason,\n  BatchEvaluationResult,\n  // Service State\n  ServiceHealthStatus,\n  // SSE\n  SSEClient,\n  SSEConnectionOptions,\n} from \"./types\";\n\nexport { DEFAULT_SERVICE_CONFIG } from \"./types\";\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create Feature Flag Service with caching and real-time updates",
      "status": "completed",
      "activeForm": "Creating feature flag service"
    },
    {
      "content": "Create useFeatureFlags React hook for client integration",
      "status": "in_progress",
      "activeForm": "Creating useFeatureFlags hook"
    },
    {
      "content": "Create server functions for feature flag API",
      "status": "pending",
      "activeForm": "Creating server functions"
    },
    {
      "content": "Create API routes for real-time feature flag updates",
      "status": "pending",
      "activeForm": "Creating API routes"
    },
    {
      "content": "Create Playwright test to verify feature flag service",
      "status": "pending",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and cleanup",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}
Now let me create the query options and the React hook:

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\queries\\feature-flags.ts",
  "content": "/**\n * Feature Flag Query Options\n *\n * TanStack Query options for feature flag data fetching with:\n * - Optimized caching strategies\n * - Automatic refetching\n * - Stale time configuration\n */\n\nimport { queryOptions } from \"@tanstack/react-query\";\nimport {\n  checkFeatureFn,\n  checkMultipleFeaturesFn,\n  getFeatureFlagsFn,\n  getFeatureFlagByIdFn,\n  getFeatureFlagByNameFn,\n  getFeatureFlagUserTargetsFn,\n  getFeatureFlagRoleTargetsFn,\n} from \"~/fn/feature-flags\";\nimport type { RolloutStrategy } from \"~/db/schema\";\n\n// =============================================================================\n// Query Key Factory\n// =============================================================================\n\nexport const featureFlagKeys = {\n  all: [\"feature-flags\"] as const,\n  lists: () => [...featureFlagKeys.all, \"list\"] as const,\n  list: (filters?: FeatureFlagsListParams) =>\n    [...featureFlagKeys.lists(), filters] as const,\n  details: () => [...featureFlagKeys.all, \"detail\"] as const,\n  detail: (id: string) => [...featureFlagKeys.details(), id] as const,\n  byName: (name: string) => [...featureFlagKeys.all, \"name\", name] as const,\n  evaluation: () => [...featureFlagKeys.all, \"evaluation\"] as const,\n  evaluate: (flagName: string) =>\n    [...featureFlagKeys.evaluation(), flagName] as const,\n  evaluateMultiple: (flagNames: string[]) =>\n    [...featureFlagKeys.evaluation(), \"multiple\", ...flagNames] as const,\n  targets: () => [...featureFlagKeys.all, \"targets\"] as const,\n  userTargets: (flagId: string) =>\n    [...featureFlagKeys.targets(), \"user\", flagId] as const,\n  roleTargets: (flagId: string) =>\n    [...featureFlagKeys.targets(), \"role\", flagId] as const,\n};\n\n// =============================================================================\n// Query Parameter Types\n// =============================================================================\n\nexport interface FeatureFlagsListParams {\n  enabled?: boolean;\n  rolloutStrategy?: RolloutStrategy;\n  limit?: number;\n  offset?: number;\n}\n\n// =============================================================================\n// User Query Options (Authenticated Users)\n// =============================================================================\n\n/**\n * Query options for checking a single feature flag\n * Uses aggressive caching since flag values don't change often\n */\nexport function checkFeatureFlagQueryOptions(flagName: string) {\n  return queryOptions({\n    queryKey: featureFlagKeys.evaluate(flagName),\n    queryFn: () => checkFeatureFn({ data: { flagName } }),\n    staleTime: 30000, // 30 seconds\n    gcTime: 300000, // 5 minutes\n  });\n}\n\n/**\n * Query options for checking multiple feature flags at once\n * More efficient than multiple individual checks\n */\nexport function checkMultipleFlagsQueryOptions(flagNames: string[]) {\n  return queryOptions({\n    queryKey: featureFlagKeys.evaluateMultiple(flagNames),\n    queryFn: () => checkMultipleFeaturesFn({ data: { flagNames } }),\n    staleTime: 30000, // 30 seconds\n    gcTime: 300000, // 5 minutes\n    enabled: flagNames.length > 0,\n  });\n}\n\n// =============================================================================\n// Admin Query Options\n// =============================================================================\n\n/**\n * Query options for listing all feature flags (admin only)\n */\nexport function featureFlagsListQueryOptions(params?: FeatureFlagsListParams) {\n  return queryOptions({\n    queryKey: featureFlagKeys.list(params),\n    queryFn: () => getFeatureFlagsFn({ data: params }),\n    staleTime: 10000, // 10 seconds for admin views\n    gcTime: 60000, // 1 minute\n  });\n}\n\n/**\n * Query options for getting a feature flag by ID (admin only)\n */\nexport function featureFlagDetailQueryOptions(id: string) {\n  return queryOptions({\n    queryKey: featureFlagKeys.detail(id),\n    queryFn: () => getFeatureFlagByIdFn({ data: { id } }),\n    staleTime: 10000,\n    gcTime: 60000,\n    enabled: !!id,\n  });\n}\n\n/**\n * Query options for getting a feature flag by name (admin only)\n */\nexport function featureFlagByNameQueryOptions(flagName: string) {\n  return queryOptions({\n    queryKey: featureFlagKeys.byName(flagName),\n    queryFn: () => getFeatureFlagByNameFn({ data: { flagName } }),\n    staleTime: 10000,\n    gcTime: 60000,\n    enabled: !!flagName,\n  });\n}\n\n/**\n * Query options for getting user targets of a flag (admin only)\n */\nexport function featureFlagUserTargetsQueryOptions(featureFlagId: string) {\n  return queryOptions({\n    queryKey: featureFlagKeys.userTargets(featureFlagId),\n    queryFn: () => getFeatureFlagUserTargetsFn({ data: { featureFlagId } }),\n    staleTime: 10000,\n    gcTime: 60000,\n    enabled: !!featureFlagId,\n  });\n}\n\n/**\n * Query options for getting role targets of a flag (admin only)\n */\nexport function featureFlagRoleTargetsQueryOptions(featureFlagId: string) {\n  return queryOptions({\n    queryKey: featureFlagKeys.roleTargets(featureFlagId),\n    queryFn: () => getFeatureFlagRoleTargetsFn({ data: { featureFlagId } }),\n    staleTime: 10000,\n    gcTime: 60000,\n    enabled: !!featureFlagId,\n  });\n}\n"
}

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\hooks\\useFeatureFlags.ts",
  "content": "/**\n * Feature Flag Hooks\n *\n * React hooks for feature flag evaluation with:\n * - TanStack Query integration for caching\n * - Real-time updates via SSE\n * - Batch evaluation support\n * - Admin management hooks\n */\n\nimport { useQuery, useMutation, useQueryClient } from \"@tanstack/react-query\";\nimport { useState, useEffect, useCallback, useRef } from \"react\";\nimport {\n  checkFeatureFlagQueryOptions,\n  checkMultipleFlagsQueryOptions,\n  featureFlagsListQueryOptions,\n  featureFlagDetailQueryOptions,\n  featureFlagByNameQueryOptions,\n  featureFlagUserTargetsQueryOptions,\n  featureFlagRoleTargetsQueryOptions,\n  featureFlagKeys,\n  type FeatureFlagsListParams,\n} from \"~/queries/feature-flags\";\nimport {\n  createFeatureFlagFn,\n  updateFeatureFlagFn,\n  deleteFeatureFlagFn,\n  toggleFeatureFlagFn,\n  updateRolloutPercentageFn,\n  addUserTargetFn,\n  removeUserTargetFn,\n  addRoleTargetFn,\n  removeRoleTargetFn,\n} from \"~/fn/feature-flags\";\nimport type { RolloutStrategy, UserRole } from \"~/db/schema\";\n\n// =============================================================================\n// User Hooks (For Feature Evaluation)\n// =============================================================================\n\n/**\n * Check if a single feature flag is enabled\n *\n * @example\n * ```tsx\n * function MyComponent() {\n *   const { isEnabled, isLoading } = useFeatureFlag(\"new_dashboard\");\n *\n *   if (isLoading) return <Loading />;\n *   if (!isEnabled) return <OldDashboard />;\n *   return <NewDashboard />;\n * }\n * ```\n */\nexport function useFeatureFlag(flagName: string, enabled = true) {\n  const query = useQuery({\n    ...checkFeatureFlagQueryOptions(flagName),\n    enabled: enabled && !!flagName,\n  });\n\n  return {\n    isEnabled: query.data?.enabled ?? false,\n    isLoading: query.isLoading,\n    isError: query.isError,\n    error: query.error,\n    refetch: query.refetch,\n  };\n}\n\n/**\n * Check multiple feature flags at once (more efficient than multiple useFeatureFlag calls)\n *\n * @example\n * ```tsx\n * function MyComponent() {\n *   const { flags, isLoading } = useFeatureFlags([\"feature_a\", \"feature_b\", \"feature_c\"]);\n *\n *   if (isLoading) return <Loading />;\n *\n *   return (\n *     <>\n *       {flags.feature_a && <FeatureA />}\n *       {flags.feature_b && <FeatureB />}\n *       {flags.feature_c && <FeatureC />}\n *     </>\n *   );\n * }\n * ```\n */\nexport function useFeatureFlags(flagNames: string[], enabled = true) {\n  const query = useQuery({\n    ...checkMultipleFlagsQueryOptions(flagNames),\n    enabled: enabled && flagNames.length > 0,\n  });\n\n  return {\n    flags: query.data ?? {},\n    isLoading: query.isLoading,\n    isError: query.isError,\n    error: query.error,\n    refetch: query.refetch,\n  };\n}\n\n/**\n * Hook with real-time updates via Server-Sent Events\n *\n * @example\n * ```tsx\n * function MyComponent() {\n *   const { flags, isConnected } = useFeatureFlagsWithSSE([\"feature_a\", \"feature_b\"]);\n *\n *   return (\n *     <>\n *       {!isConnected && <OfflineIndicator />}\n *       {flags.feature_a && <FeatureA />}\n *     </>\n *   );\n * }\n * ```\n */\nexport function useFeatureFlagsWithSSE(\n  flagNames: string[],\n  options?: {\n    enabled?: boolean;\n    onUpdate?: (flagName: string, enabled: boolean) => void;\n  }\n) {\n  const queryClient = useQueryClient();\n  const [isConnected, setIsConnected] = useState(false);\n  const eventSourceRef = useRef<EventSource | null>(null);\n\n  // Get initial flag values\n  const { flags, isLoading, isError, error, refetch } = useFeatureFlags(\n    flagNames,\n    options?.enabled ?? true\n  );\n\n  // Connect to SSE for real-time updates\n  useEffect(() => {\n    if (typeof window === \"undefined\" || !options?.enabled) return;\n\n    const eventSource = new EventSource(\"/api/feature-flags/sse\");\n    eventSourceRef.current = eventSource;\n\n    eventSource.onopen = () => {\n      setIsConnected(true);\n    };\n\n    eventSource.onmessage = (event) => {\n      try {\n        const data = JSON.parse(event.data);\n\n        if (data.type?.startsWith(\"flag.\")) {\n          // Invalidate the specific flag query\n          queryClient.invalidateQueries({\n            queryKey: featureFlagKeys.evaluate(data.flagName),\n          });\n\n          // Invalidate the multiple flags query\n          queryClient.invalidateQueries({\n            queryKey: featureFlagKeys.evaluateMultiple(flagNames),\n          });\n\n          // Call the update callback\n          if (options?.onUpdate && flagNames.includes(data.flagName)) {\n            options.onUpdate(data.flagName, data.payload?.enabled);\n          }\n        }\n      } catch (err) {\n        console.error(\"Error parsing SSE event:\", err);\n      }\n    };\n\n    eventSource.onerror = () => {\n      setIsConnected(false);\n      // Auto-reconnect is handled by EventSource\n    };\n\n    return () => {\n      eventSource.close();\n      eventSourceRef.current = null;\n      setIsConnected(false);\n    };\n  }, [flagNames, options?.enabled, queryClient, options?.onUpdate]);\n\n  return {\n    flags,\n    isLoading,\n    isError,\n    error,\n    isConnected,\n    refetch,\n  };\n}\n\n/**\n * Convenient hook for A/B testing\n *\n * @example\n * ```tsx\n * function MyComponent() {\n *   const variant = useABTest(\"homepage_variant\", [\"control\", \"variant_a\", \"variant_b\"]);\n *\n *   switch (variant) {\n *     case \"variant_a\": return <VariantA />;\n *     case \"variant_b\": return <VariantB />;\n *     default: return <Control />;\n *   }\n * }\n * ```\n */\nexport function useABTest<T extends string>(\n  testName: string,\n  variants: readonly T[],\n  defaultVariant?: T\n): T {\n  const { flags, isLoading } = useFeatureFlags(\n    variants.map((v) => `${testName}_${v}`)\n  );\n\n  if (isLoading) {\n    return defaultVariant ?? variants[0];\n  }\n\n  // Find the first enabled variant\n  for (const variant of variants) {\n    if (flags[`${testName}_${variant}`]) {\n      return variant;\n    }\n  }\n\n  return defaultVariant ?? variants[0];\n}\n\n// =============================================================================\n// Admin Hooks (For Flag Management)\n// =============================================================================\n\n/**\n * Get all feature flags (admin only)\n */\nexport function useFeatureFlagsList(\n  params?: FeatureFlagsListParams,\n  enabled = true\n) {\n  return useQuery({\n    ...featureFlagsListQueryOptions(params),\n    enabled,\n  });\n}\n\n/**\n * Get a feature flag by ID with targets (admin only)\n */\nexport function useFeatureFlagDetail(id: string, enabled = true) {\n  return useQuery({\n    ...featureFlagDetailQueryOptions(id),\n    enabled: enabled && !!id,\n  });\n}\n\n/**\n * Get a feature flag by name with targets (admin only)\n */\nexport function useFeatureFlagByName(flagName: string, enabled = true) {\n  return useQuery({\n    ...featureFlagByNameQueryOptions(flagName),\n    enabled: enabled && !!flagName,\n  });\n}\n\n/**\n * Get user targets for a feature flag (admin only)\n */\nexport function useFeatureFlagUserTargets(featureFlagId: string, enabled = true) {\n  return useQuery({\n    ...featureFlagUserTargetsQueryOptions(featureFlagId),\n    enabled: enabled && !!featureFlagId,\n  });\n}\n\n/**\n * Get role targets for a feature flag (admin only)\n */\nexport function useFeatureFlagRoleTargets(featureFlagId: string, enabled = true) {\n  return useQuery({\n    ...featureFlagRoleTargetsQueryOptions(featureFlagId),\n    enabled: enabled && !!featureFlagId,\n  });\n}\n\n// =============================================================================\n// Admin Mutation Hooks\n// =============================================================================\n\n/**\n * Create a new feature flag (admin only)\n */\nexport function useCreateFeatureFlag() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: {\n      flagName: string;\n      description?: string;\n      enabled?: boolean;\n      rolloutPercentage?: number;\n      rolloutStrategy?: RolloutStrategy;\n      metadata?: string;\n    }) => createFeatureFlagFn({ data }),\n    onSuccess: () => {\n      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });\n    },\n  });\n}\n\n/**\n * Update a feature flag (admin only)\n */\nexport function useUpdateFeatureFlag() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: {\n      id: string;\n      description?: string;\n      enabled?: boolean;\n      rolloutPercentage?: number;\n      rolloutStrategy?: RolloutStrategy;\n      metadata?: string;\n    }) => updateFeatureFlagFn({ data }),\n    onSuccess: (data) => {\n      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.detail(data.id),\n      });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.byName(data.flagName),\n      });\n      // Invalidate evaluation queries\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.evaluate(data.flagName),\n      });\n    },\n  });\n}\n\n/**\n * Delete a feature flag (admin only)\n */\nexport function useDeleteFeatureFlag() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (id: string) => deleteFeatureFlagFn({ data: { id } }),\n    onSuccess: () => {\n      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });\n      queryClient.invalidateQueries({ queryKey: featureFlagKeys.evaluation() });\n    },\n  });\n}\n\n/**\n * Toggle a feature flag on/off (admin only)\n */\nexport function useToggleFeatureFlag() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: { id: string; enabled: boolean }) =>\n      toggleFeatureFlagFn({ data }),\n    onSuccess: (data) => {\n      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.detail(data.id),\n      });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.evaluate(data.flagName),\n      });\n    },\n  });\n}\n\n/**\n * Update rollout percentage (admin only)\n */\nexport function useUpdateRolloutPercentage() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: { id: string; rolloutPercentage: number }) =>\n      updateRolloutPercentageFn({ data }),\n    onSuccess: (data) => {\n      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.detail(data.id),\n      });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.evaluate(data.flagName),\n      });\n    },\n  });\n}\n\n/**\n * Add user target (admin only)\n */\nexport function useAddUserTarget() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: {\n      featureFlagId: string;\n      userId: string;\n      enabled?: boolean;\n    }) => addUserTargetFn({ data }),\n    onSuccess: (_, variables) => {\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.userTargets(variables.featureFlagId),\n      });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.detail(variables.featureFlagId),\n      });\n    },\n  });\n}\n\n/**\n * Remove user target (admin only)\n */\nexport function useRemoveUserTarget() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: { featureFlagId: string; userId: string }) =>\n      removeUserTargetFn({ data }),\n    onSuccess: (_, variables) => {\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.userTargets(variables.featureFlagId),\n      });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.detail(variables.featureFlagId),\n      });\n    },\n  });\n}\n\n/**\n * Add role target (admin only)\n */\nexport function useAddRoleTarget() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: {\n      featureFlagId: string;\n      role: UserRole;\n      enabled?: boolean;\n    }) => addRoleTargetFn({ data }),\n    onSuccess: (_, variables) => {\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.roleTargets(variables.featureFlagId),\n      });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.detail(variables.featureFlagId),\n      });\n    },\n  });\n}\n\n/**\n * Remove role target (admin only)\n */\nexport function useRemoveRoleTarget() {\n  const queryClient = useQueryClient();\n\n  return useMutation({\n    mutationFn: (data: { featureFlagId: string; role: UserRole }) =>\n      removeRoleTargetFn({ data }),\n    onSuccess: (_, variables) => {\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.roleTargets(variables.featureFlagId),\n      });\n      queryClient.invalidateQueries({\n        queryKey: featureFlagKeys.detail(variables.featureFlagId),\n      });\n    },\n  });\n}\n\n// =============================================================================\n// Type Exports\n// =============================================================================\n\nexport type { FeatureFlagsListParams };\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create Feature Flag Service with caching and real-time updates",
      "status": "completed",
      "activeForm": "Creating feature flag service"
    },
    {
      "content": "Create useFeatureFlags React hook for client integration",
      "status": "completed",
      "activeForm": "Creating useFeatureFlags hook"
    },
    {
      "content": "Create server functions for feature flag API",
      "status": "completed",
      "activeForm": "Creating server functions"
    },
    {
      "content": "Create API routes for real-time feature flag updates",
      "status": "in_progress",
      "activeForm": "Creating API routes"
    },
    {
      "content": "Create Playwright test to verify feature flag service",
      "status": "pending",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and cleanup",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}
Now let me create the SSE API route for real-time feature flag updates:

🔧 Tool: Bash
Input: {
  "command": "mkdir -p \"C:\\repos\\AIOM-V2\\src\\routes\\api\\feature-flags\" 2>/dev/null || mkdir \"C:\\repos\\AIOM-V2\\src\\routes\\api\\feature-flags\" 2>nul || echo \"Directory may already exist\"",
  "description": "Create feature-flags API directory"
}

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\routes\\api\\feature-flags\\sse.ts",
  "content": "/**\n * Feature Flag Server-Sent Events (SSE) API Route\n *\n * Provides real-time updates for feature flag changes.\n * Clients can connect to this endpoint to receive notifications\n * when feature flags are toggled, updated, or deleted.\n *\n * Authentication: Requires valid session\n * Method: GET\n *\n * @example\n * ```typescript\n * const eventSource = new EventSource(\"/api/feature-flags/sse\");\n *\n * eventSource.onmessage = (event) => {\n *   const data = JSON.parse(event.data);\n *   console.log(\"Flag change:\", data);\n * };\n * ```\n */\n\nimport { createFileRoute } from \"@tanstack/react-router\";\nimport { getFeatureFlagEventEmitter } from \"~/lib/feature-flag-service\";\nimport { auth } from \"~/lib/auth-client\";\nimport type { FeatureFlagEvent } from \"~/lib/feature-flag-service/types\";\n\nexport const Route = createFileRoute(\"/api/feature-flags/sse\")({\n  server: {\n    handlers: {\n      GET: async ({ request }) => {\n        // Verify authentication\n        const session = await auth.api.getSession({\n          headers: request.headers,\n        });\n\n        if (!session?.user?.id) {\n          return new Response(\"Unauthorized\", { status: 401 });\n        }\n\n        const userId = session.user.id;\n        const userRole = (session.user as { role?: string }).role as\n          | \"md\"\n          | \"field-tech\"\n          | \"admin\"\n          | \"sales\"\n          | null;\n\n        // Set up SSE response\n        const encoder = new TextEncoder();\n        let controllerRef: ReadableStreamDefaultController | null = null;\n\n        const stream = new ReadableStream({\n          start(controller) {\n            controllerRef = controller;\n\n            // Get event emitter\n            const eventEmitter = getFeatureFlagEventEmitter();\n\n            // Send initial connection event\n            const connectionEvent = JSON.stringify({\n              type: \"connection\",\n              timestamp: Date.now(),\n              userId,\n            });\n            controller.enqueue(encoder.encode(`data: ${connectionEvent}\\n\\n`));\n\n            // Register SSE client\n            const client = eventEmitter.registerSSEClient(\n              userId,\n              userRole,\n              (event: FeatureFlagEvent) => {\n                try {\n                  const data = JSON.stringify(event);\n                  controller.enqueue(encoder.encode(`data: ${data}\\n\\n`));\n                } catch (error) {\n                  console.error(\"Error sending SSE event:\", error);\n                }\n              },\n              () => {\n                try {\n                  controller.close();\n                } catch {\n                  // Ignore close errors\n                }\n              }\n            );\n\n            // Store client ID for cleanup\n            (controller as { clientId?: string }).clientId = client.id;\n\n            // Set up keepalive ping\n            const pingInterval = setInterval(() => {\n              try {\n                const ping = JSON.stringify({\n                  type: \"ping\",\n                  timestamp: Date.now(),\n                });\n                controller.enqueue(encoder.encode(`data: ${ping}\\n\\n`));\n                eventEmitter.pingClient(client.id);\n              } catch {\n                clearInterval(pingInterval);\n              }\n            }, 30000); // Ping every 30 seconds\n\n            // Store interval for cleanup\n            (controller as { pingInterval?: NodeJS.Timeout }).pingInterval =\n              pingInterval;\n          },\n\n          cancel() {\n            // Clean up on disconnect\n            if (controllerRef) {\n              const ctrl = controllerRef as {\n                clientId?: string;\n                pingInterval?: NodeJS.Timeout;\n              };\n\n              if (ctrl.pingInterval) {\n                clearInterval(ctrl.pingInterval);\n              }\n\n              if (ctrl.clientId) {\n                const eventEmitter = getFeatureFlagEventEmitter();\n                eventEmitter.unregisterSSEClient(ctrl.clientId);\n              }\n            }\n          },\n        });\n\n        return new Response(stream, {\n          headers: {\n            \"Content-Type\": \"text/event-stream\",\n            \"Cache-Control\": \"no-cache, no-transform\",\n            Connection: \"keep-alive\",\n            \"X-Accel-Buffering\": \"no\",\n          },\n        });\n      },\n    },\n  },\n});\n"
}

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\routes\\api\\feature-flags\\health.ts",
  "content": "/**\n * Feature Flag Service Health Check API Route\n *\n * Returns the health status of the feature flag service including:\n * - Cache statistics\n * - Connected SSE clients\n * - Service uptime\n *\n * Authentication: None required (for monitoring tools)\n * Method: GET\n */\n\nimport { createFileRoute } from \"@tanstack/react-router\";\nimport { getFeatureFlagService } from \"~/lib/feature-flag-service\";\n\nexport const Route = createFileRoute(\"/api/feature-flags/health\")({\n  server: {\n    handlers: {\n      GET: async () => {\n        try {\n          const service = getFeatureFlagService();\n          const health = service.getHealthStatus();\n          const cacheStats = service.getCacheStats();\n\n          return Response.json({\n            status: \"ok\",\n            service: \"feature-flag-service\",\n            timestamp: new Date().toISOString(),\n            health: {\n              healthy: health.healthy,\n              uptime: health.uptime,\n              uptimeFormatted: formatUptime(health.uptime),\n            },\n            cache: {\n              size: cacheStats.size,\n              hits: cacheStats.hits,\n              misses: cacheStats.misses,\n              hitRate: `${(cacheStats.hitRate * 100).toFixed(2)}%`,\n              evictions: cacheStats.evictions,\n            },\n            realtime: {\n              connectedClients: health.connectedClients,\n            },\n          });\n        } catch (error) {\n          console.error(\"Feature flag health check error:\", error);\n          return Response.json(\n            {\n              status: \"error\",\n              service: \"feature-flag-service\",\n              timestamp: new Date().toISOString(),\n              error: \"Health check failed\",\n            },\n            { status: 500 }\n          );\n        }\n      },\n    },\n  },\n});\n\n/**\n * Format uptime in human-readable format\n */\nfunction formatUptime(ms: number): string {\n  const seconds = Math.floor(ms / 1000);\n  const minutes = Math.floor(seconds / 60);\n  const hours = Math.floor(minutes / 60);\n  const days = Math.floor(hours / 24);\n\n  if (days > 0) {\n    return `${days}d ${hours % 24}h ${minutes % 60}m`;\n  } else if (hours > 0) {\n    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;\n  } else if (minutes > 0) {\n    return `${minutes}m ${seconds % 60}s`;\n  } else {\n    return `${seconds}s`;\n  }\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create Feature Flag Service with caching and real-time updates",
      "status": "completed",
      "activeForm": "Creating feature flag service"
    },
    {
      "content": "Create useFeatureFlags React hook for client integration",
      "status": "completed",
      "activeForm": "Creating useFeatureFlags hook"
    },
    {
      "content": "Create server functions for feature flag API",
      "status": "completed",
      "activeForm": "Creating server functions"
    },
    {
      "content": "Create API routes for real-time feature flag updates",
      "status": "completed",
      "activeForm": "Creating API routes"
    },
    {
      "content": "Create Playwright test to verify feature flag service",
      "status": "in_progress",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and cleanup",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}
Now let me check the Playwright configuration and create a verification test:

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\playwright.config.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "tests/**/*",
  "path": "C:\\repos\\AIOM-V2"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\tests\\field-tech-dashboard-verification.spec.ts",
  "limit": 50
}
Now let me create a verification test for the feature flag service:

🔧 Tool: Write
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\tests\\feature-flag-service-verification.spec.ts",
  "content": "import { test, expect } from \"@playwright/test\";\n\n/**\n * Feature Flag Service Verification Test\n *\n * This test verifies that the feature flag service is correctly implemented:\n * - Health endpoint is accessible\n * - SSE endpoint exists\n * - Service files are properly structured\n */\n\ntest.describe(\"Feature Flag Service\", () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to the main page first to ensure server is ready\n    await page.goto(\"/\");\n  });\n\n  test(\"health endpoint should return service status\", async ({ request }) => {\n    // Call the health endpoint\n    const response = await request.get(\"/api/feature-flags/health\");\n\n    // Verify response status\n    expect(response.status()).toBe(200);\n\n    // Parse and verify response body\n    const data = await response.json();\n\n    expect(data).toHaveProperty(\"status\", \"ok\");\n    expect(data).toHaveProperty(\"service\", \"feature-flag-service\");\n    expect(data).toHaveProperty(\"timestamp\");\n    expect(data).toHaveProperty(\"health\");\n    expect(data).toHaveProperty(\"cache\");\n    expect(data).toHaveProperty(\"realtime\");\n\n    // Verify health section\n    expect(data.health).toHaveProperty(\"healthy\", true);\n    expect(data.health).toHaveProperty(\"uptime\");\n    expect(data.health.uptime).toBeGreaterThanOrEqual(0);\n\n    // Verify cache section\n    expect(data.cache).toHaveProperty(\"size\");\n    expect(data.cache).toHaveProperty(\"hits\");\n    expect(data.cache).toHaveProperty(\"misses\");\n    expect(data.cache).toHaveProperty(\"hitRate\");\n\n    // Verify realtime section\n    expect(data.realtime).toHaveProperty(\"connectedClients\");\n    expect(typeof data.realtime.connectedClients).toBe(\"number\");\n  });\n\n  test(\"SSE endpoint should require authentication\", async ({ request }) => {\n    // Call the SSE endpoint without authentication\n    const response = await request.get(\"/api/feature-flags/sse\");\n\n    // Should return 401 Unauthorized when not authenticated\n    expect(response.status()).toBe(401);\n  });\n\n  test(\"service should be available on home page\", async ({ page }) => {\n    // Navigate to home page\n    await page.goto(\"/\");\n\n    // Page should load successfully\n    expect(page.url()).toContain(\"localhost:3000\");\n\n    // Check that the page content exists\n    const pageContent = await page.content();\n    expect(pageContent).toBeDefined();\n    expect(pageContent.length).toBeGreaterThan(0);\n  });\n\n  test(\"health endpoint should return cache statistics\", async ({ request }) => {\n    // Make multiple calls to verify cache stats are tracked\n    const response1 = await request.get(\"/api/feature-flags/health\");\n    expect(response1.status()).toBe(200);\n\n    const data1 = await response1.json();\n\n    // Cache stats should be numbers\n    expect(typeof data1.cache.size).toBe(\"number\");\n    expect(typeof data1.cache.hits).toBe(\"number\");\n    expect(typeof data1.cache.misses).toBe(\"number\");\n    expect(typeof data1.cache.evictions).toBe(\"number\");\n\n    // Hit rate should be a formatted percentage string\n    expect(data1.cache.hitRate).toMatch(/^\\d+\\.\\d{2}%$/);\n  });\n\n  test(\"health endpoint should track uptime\", async ({ request }) => {\n    // Get initial health status\n    const response1 = await request.get(\"/api/feature-flags/health\");\n    const data1 = await response1.json();\n    const uptime1 = data1.health.uptime;\n\n    // Wait a bit\n    await new Promise((resolve) => setTimeout(resolve, 1000));\n\n    // Get health status again\n    const response2 = await request.get(\"/api/feature-flags/health\");\n    const data2 = await response2.json();\n    const uptime2 = data2.health.uptime;\n\n    // Uptime should have increased\n    expect(uptime2).toBeGreaterThan(uptime1);\n  });\n\n  test(\"health endpoint should include formatted uptime\", async ({ request }) => {\n    const response = await request.get(\"/api/feature-flags/health\");\n    const data = await response.json();\n\n    // Should have formatted uptime string\n    expect(data.health).toHaveProperty(\"uptimeFormatted\");\n    expect(typeof data.health.uptimeFormatted).toBe(\"string\");\n\n    // Should match uptime format (e.g., \"5s\", \"1m 30s\", \"2h 15m 30s\", \"1d 5h 30m\")\n    expect(data.health.uptimeFormatted).toMatch(\n      /^(\\d+d\\s)?(\\d+h\\s)?(\\d+m\\s)?(\\d+s)?$/\n    );\n  });\n});\n\ntest.describe(\"Feature Flag Service Integration\", () => {\n  test(\"should handle concurrent health check requests\", async ({ request }) => {\n    // Make multiple concurrent requests\n    const requests = Array.from({ length: 5 }, () =>\n      request.get(\"/api/feature-flags/health\")\n    );\n\n    const responses = await Promise.all(requests);\n\n    // All requests should succeed\n    for (const response of responses) {\n      expect(response.status()).toBe(200);\n      const data = await response.json();\n      expect(data.status).toBe(\"ok\");\n    }\n  });\n\n  test(\"health data should be consistent across requests\", async ({ request }) => {\n    // Make two quick sequential requests\n    const response1 = await request.get(\"/api/feature-flags/health\");\n    const response2 = await request.get(\"/api/feature-flags/health\");\n\n    const data1 = await response1.json();\n    const data2 = await response2.json();\n\n    // Service name should be consistent\n    expect(data1.service).toBe(data2.service);\n\n    // Health status should be consistent\n    expect(data1.health.healthy).toBe(data2.health.healthy);\n  });\n});\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create Feature Flag Service with caching and real-time updates",
      "status": "completed",
      "activeForm": "Creating feature flag service"
    },
    {
      "content": "Create useFeatureFlags React hook for client integration",
      "status": "completed",
      "activeForm": "Creating useFeatureFlags hook"
    },
    {
      "content": "Create server functions for feature flag API",
      "status": "completed",
      "activeForm": "Creating server functions"
    },
    {
      "content": "Create API routes for real-time feature flag updates",
      "status": "completed",
      "activeForm": "Creating API routes"
    },
    {
      "content": "Create Playwright test to verify feature flag service",
      "status": "completed",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and cleanup",
      "status": "in_progress",
      "activeForm": "Running verification test"
    }
  ]
}
Now let me run the Playwright test to verify the implementation works:

🔧 Tool: Bash
Input: {
  "command": "cd C:/repos/AIOM-V2 && npx playwright test tests/feature-flag-service-verification.spec.ts --reporter=list 2>&1 | head -100",
  "description": "Run Playwright test for feature flag service",
  "timeout": 300000
}
The test revealed an issue with the SSE route - the auth import is incorrect. Let me check how auth is used in the codebase:

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\lib\\auth-client.ts"
}

🔧 Tool: Grep
Input: {
  "pattern": "import.*auth.*from",
  "path": "C:\\repos\\AIOM-V2\\src\\routes\\api",
  "output_mode": "content",
  "-n": true
}
Ah, I see! The auth module should be imported from `~/utils/auth`, not `~/lib/auth-client`. Let me fix this:

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\utils\\auth.ts"
}

🔧 Tool: Edit
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\routes\\api\\feature-flags\\sse.ts",
  "old_string": "import { auth } from \"~/lib/auth-client\";",
  "new_string": "import { auth } from \"~/utils/auth\";"
}

🔧 Tool: Read
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\routes\\api\\feature-flags\\sse.ts"
}

🔧 Tool: Edit
Input: {
  "file_path": "C:\\repos\\AIOM-V2\\src\\routes\\api\\feature-flags\\sse.ts",
  "old_string": "import { auth } from \"~/lib/auth-client\";",
  "new_string": "import { auth } from \"~/utils/auth\";"
}
Now let's run the test again to verify the fix:

🔧 Tool: Bash
Input: {
  "command": "cd C:/repos/AIOM-V2 && npx playwright test tests/feature-flag-service-verification.spec.ts --reporter=list 2>&1 | head -80",
  "description": "Run Playwright test after auth fix",
  "timeout": 300000
}
All 8 tests pass. Now let me clean up the test file as per the instructions and complete the todo list:

🔧 Tool: Bash
Input: {
  "command": "rm \"C:/repos/AIOM-V2/tests/feature-flag-service-verification.spec.ts\"",
  "description": "Delete verification test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create Feature Flag Service with caching and real-time updates",
      "status": "completed",
      "activeForm": "Creating feature flag service"
    },
    {
      "content": "Create useFeatureFlags React hook for client integration",
      "status": "completed",
      "activeForm": "Creating useFeatureFlags hook"
    },
    {
      "content": "Create server functions for feature flag API",
      "status": "completed",
      "activeForm": "Creating server functions"
    },
    {
      "content": "Create API routes for real-time feature flag updates",
      "status": "completed",
      "activeForm": "Creating API routes"
    },
    {
      "content": "Create Playwright test to verify feature flag service",
      "status": "completed",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and cleanup",
      "status": "completed",
      "activeForm": "Running verification test"
    }
  ]
}
<summary>
## Summary: Feature Flag Service for Gradual Rollout and A/B Testing

### Changes Implemented

1. **Feature Flag Service (`src/lib/feature-flag-service/`)** - A comprehensive service layer with:
   - **types.ts**: Type definitions for configuration, events, caching, evaluation, and SSE
   - **cache.ts**: LRU-style cache with TTL-based expiration, hit/miss statistics, and invalidation by flag/user/role
   - **event-emitter.ts**: Event-driven architecture for real-time updates with pub/sub pattern and SSE client management
   - **service.ts**: Main service class with caching, event emission, batch evaluation, health monitoring, and flag management
   - **index.ts**: Clean exports for all service components

2. **Query Options (`src/queries/feature-flags.ts`)** - TanStack Query integration with:
   - Query key factory for consistent caching
   - User evaluation queries (single and batch)
   - Admin management queries (list, detail, targets)
   - Optimized stale times for different use cases

3. **React Hooks (`src/hooks/useFeatureFlags.ts`)** - Client-side integration with:
   - `useFeatureFlag()` - Check single flag
   - `useFeatureFlags()` - Check multiple flags efficiently
   - `useFeatureFlagsWithSSE()` - Real-time updates via Server-Sent Events
   - `useABTest()` - Convenient A/B testing helper
   - Admin hooks for flag management (CRUD, targeting, rollout)

4. **API Routes (`src/routes/api/feature-flags/`)** - Real-time updates:
   - **sse.ts**: Server-Sent Events endpoint for real-time flag changes
   - **health.ts**: Health check endpoint with cache stats and uptime

### Files Modified/Created
- `src/lib/feature-flag-service/types.ts` (new)
- `src/lib/feature-flag-service/cache.ts` (new)
- `src/lib/feature-flag-service/event-emitter.ts` (new)
- `src/lib/feature-flag-service/service.ts` (new)
- `src/lib/feature-flag-service/index.ts` (new)
- `src/queries/feature-flags.ts` (new)
- `src/hooks/useFeatureFlags.ts` (new)
- `src/routes/api/feature-flags/sse.ts` (new)
- `src/routes/api/feature-flags/health.ts` (new)

### Verification Status
- ✅ Created Playwright verification test with 8 test cases
- ✅ All 8 tests passed successfully:
  - Health endpoint returns service status
  - SSE endpoint requires authentication (returns 401 when not authenticated)
  - Service available on home page
  - Health endpoint returns cache statistics
  - Health endpoint tracks uptime
  - Health endpoint includes formatted uptime
  - Concurrent health check requests handled
  - Health data consistent across requests
- ✅ Test file deleted after successful verification

### Notes for Developer
1. **Real-time Updates**: The SSE endpoint at `/api/feature-flags/sse` provides real-time flag updates. Use `useFeatureFlagsWithSSE()` hook for automatic UI updates.

2. **Caching**: The service uses a configurable LRU cache (default: 1000 entries, 60s TTL). Cache is automatically invalidated when flags are updated.

3. **A/B Testing**: Use `useABTest()` hook for convenient variant assignment based on feature flags.

4. **Health Monitoring**: Access `/api/feature-flags/health` to monitor service health, cache stats, and connected SSE clients.

5. **Existing Integration**: This builds on the existing feature flag schema (`featureFlag`, `featureFlagUserTarget`, `featureFlagRoleTarget`) and data access layer in the codebase.

6. **Authentication**: The SSE endpoint requires authentication via Better Auth. The health endpoint is public for monitoring tools.
</summary>