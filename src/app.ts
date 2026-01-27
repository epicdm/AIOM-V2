/**
 * Application Entry Point
 * 
 * This file initializes the application and validates environment variables
 * before starting the server.
 */

import { validateEnv } from './config/env-validator';
import { startAICOOScheduler } from './lib/ai-coo/scheduler';

// Validate environment variables at startup
console.log('🔍 Validating environment configuration...');
validateEnv();

console.log('✅ Application configuration validated');
console.log('🚀 Starting AIOM-V2...');

// Initialize AI COO Scheduler if enabled
if (process.env.ENABLE_AI_COO === 'true') {
  console.log('🤖 Initializing AI COO Scheduler...');
  startAICOOScheduler()
    .then(() => console.log('✅ AI COO Scheduler started successfully'))
    .catch((error) => {
      console.error('❌ AI COO Scheduler failed to start:', error);
      console.error('   AI COO features will be unavailable');
    });
}

// Export for use in server startup
export { validateEnv };
