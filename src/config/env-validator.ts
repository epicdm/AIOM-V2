import { z } from 'zod';

/**
 * Environment Variable Validation Schema
 * 
 * This ensures the application fails fast at startup if required
 * environment variables are missing or invalid.
 */

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Database (REQUIRED)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Authentication (REQUIRED)
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),

  // Stripe (REQUIRED for payments)
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),

  // File Storage (REQUIRED)
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),

  // Google OAuth (OPTIONAL - can be empty strings)
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),

  // Anthropic Claude API (OPTIONAL - some features require it)
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  USE_SDK_CLIENT: z.string().optional().default('false'),

  // Odoo ERP (OPTIONAL - required for ERP features)
  ODOO_URL: z.string().optional().default(''),
  ODOO_DATABASE: z.string().optional().default(''),
  ODOO_USERNAME: z.string().optional().default(''),
  ODOO_PASSWORD: z.string().optional().default(''),

  // Push Notifications (OPTIONAL)
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default(''),

  // Firebase (OPTIONAL)
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),

  // Reloadly (OPTIONAL)
  RELOADLY_CLIENT_ID: z.string().optional().default(''),
  RELOADLY_CLIENT_SECRET: z.string().optional().default(''),
  RELOADLY_SANDBOX: z.string().optional().default('true'),

  // API Keys for scheduled jobs (OPTIONAL but recommended for production)
  BRIEFING_SCHEDULER_API_KEY: z.string().optional().default(''),
  JOB_QUEUE_API_KEY: z.string().optional().default(''),
  VOUCHER_ALERT_MONITOR_API_KEY: z.string().optional().default(''),
  EXPENSE_COMPLIANCE_MONITOR_API_KEY: z.string().optional().default(''),

  // FusionPBX (OPTIONAL)
  FUSIONPBX_WEBHOOK_SECRET: z.string().optional().default(''),
  FUSIONPBX_API_URL: z.string().optional().default(''),
  FUSIONPBX_API_KEY: z.string().optional().default(''),
  RECORDING_ENCRYPTION_KEY: z.string().optional().default(''),
  RECORDING_API_KEY: z.string().optional().default(''),

  // SIP Encryption (OPTIONAL)
  SIP_ENCRYPTION_KEY: z.string().optional().default(''),

  // FlexiSIP (OPTIONAL)
  FLEXISIP_SERVER_URL: z.string().optional().default(''),
  FLEXISIP_API_KEY: z.string().optional().default(''),
  FLEXISIP_ADMIN_USERNAME: z.string().optional().default(''),
  FLEXISIP_ADMIN_PASSWORD: z.string().optional().default(''),
  FLEXISIP_DOMAIN: z.string().optional().default(''),

  // Redis (OPTIONAL - graceful degradation)
  REDIS_CACHE_ENABLED: z.string().optional().default('true'),
  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: z.string().optional().default('6379'),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().optional().default('0'),
  REDIS_CONNECT_TIMEOUT: z.string().optional().default('5000'),
  REDIS_MAX_RETRIES: z.string().optional().default('3'),
  REDIS_KEY_PREFIX: z.string().optional().default('aiom:'),
  REDIS_TLS: z.string().optional().default('false'),

  // Redis TTL Configuration
  REDIS_TTL_SESSION: z.string().optional().default('3600'),
  REDIS_TTL_ODOO: z.string().optional().default('300'),
  REDIS_TTL_AIOM: z.string().optional().default('600'),
  REDIS_TTL_FEATURE: z.string().optional().default('60'),
  REDIS_TTL_GENERAL: z.string().optional().default('300'),
});

/**
 * Public environment variables (exposed to client)
 */
const publicEnvSchema = z.object({
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  VITE_BETTER_AUTH_URL: z.string().optional(),
  VITE_STRIPE_BASIC_PRICE_ID: z.string().optional(),
  VITE_STRIPE_PRO_PRICE_ID: z.string().optional(),
  VITE_R2_ENDPOINT: z.string().min(1, 'VITE_R2_ENDPOINT is required'),
  VITE_R2_BUCKET: z.string().min(1, 'VITE_R2_BUCKET is required'),
  VITE_VAPID_PUBLIC_KEY: z.string().optional().default(''),
});

/**
 * Validate environment variables at startup
 * Throws detailed error if validation fails
 */
export function validateEnv() {
  try {
    // Validate server-side env vars
    const serverEnv = envSchema.parse(process.env);
    
    // Validate client-side env vars (only in browser/Vite context)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      publicEnvSchema.parse(import.meta.env);
    }

    console.log('✅ Environment validation passed');
    
    // Warn about optional but recommended vars in production
    if (serverEnv.NODE_ENV === 'production') {
      const warnings: string[] = [];
      
      if (!serverEnv.ANTHROPIC_API_KEY) {
        warnings.push('⚠️  ANTHROPIC_API_KEY not set - AI features will be disabled');
      }
      
      if (!serverEnv.JOB_QUEUE_API_KEY) {
        warnings.push('⚠️  JOB_QUEUE_API_KEY not set - scheduled jobs may be vulnerable');
      }
      
      if (!serverEnv.REDIS_CACHE_ENABLED || serverEnv.REDIS_CACHE_ENABLED !== 'true') {
        warnings.push('⚠️  Redis cache disabled - performance may be degraded');
      }

      if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
        warnings.push('⚠️  Google OAuth not configured - users cannot sign in with Google');
      }

      if (warnings.length > 0) {
        console.warn('\n🔔 Production Environment Warnings:');
        warnings.forEach(w => console.warn(w));
        console.warn('');
      }
    }

    return serverEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Environment Validation Failed!\n');
      console.error('Missing or invalid environment variables:\n');
      
      error.issues.forEach((issue) => {
        console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
      });
      
      console.error('\n📝 Please check your .env file and ensure all required variables are set.');
      console.error('See .env.example for reference.\n');
      
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Type-safe environment variables
 * Use this instead of process.env for type safety
 */
export type ValidatedEnv = z.infer<typeof envSchema>;
export type ValidatedPublicEnv = z.infer<typeof publicEnvSchema>;
