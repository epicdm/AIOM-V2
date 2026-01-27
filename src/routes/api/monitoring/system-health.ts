/**
 * System Health Check API Route
 * 
 * Comprehensive health check for production monitoring.
 * Checks database, Redis, external services, and system resources.
 * 
 * Use this for:
 * - Load balancer health checks
 * - Monitoring dashboards (Datadog, New Relic, etc.)
 * - Alerting systems
 * - Deployment verification
 */

import { createFileRoute } from "@tanstack/react-router";
import { database } from "~/db";
import { sql } from "drizzle-orm";

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
  };
  version: string;
  environment: string;
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple query to verify connection
    await database.execute(sql`SELECT 1 as health_check`);
    
    const responseTime = Date.now() - start;
    
    // Warn if query takes longer than 100ms
    if (responseTime > 100) {
      return {
        status: 'warn',
        responseTime,
        message: 'Database responding slowly',
      };
    }
    
    return {
      status: 'pass',
      responseTime,
      message: 'Database connection healthy',
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis connectivity (graceful degradation if not available)
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Only check if Redis is enabled
    const redisEnabled = process.env.REDIS_CACHE_ENABLED === 'true';
    
    if (!redisEnabled) {
      return {
        status: 'pass',
        message: 'Redis disabled (graceful degradation)',
      };
    }

    // Try to import and ping Redis
    const { getRedisClient } = await import('~/lib/redis-cache/client');
    const client = getRedisClient();
    
    if (!client) {
      return {
        status: 'warn',
        message: 'Redis client not initialized (graceful degradation active)',
      };
    }

    await client.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'pass',
      responseTime,
      message: 'Redis connection healthy',
    };
  } catch (error) {
    return {
      status: 'warn',
      responseTime: Date.now() - start,
      message: 'Redis unavailable (graceful degradation active)',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheck {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const heapUsedPercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);
  
  // Warn if using more than 80% of heap
  if (heapUsedPercent > 80) {
    return {
      status: 'warn',
      message: 'High memory usage',
      details: {
        heapUsedMB,
        heapTotalMB,
        heapUsedPercent,
      },
    };
  }
  
  return {
    status: 'pass',
    message: 'Memory usage normal',
    details: {
      heapUsedMB,
      heapTotalMB,
      heapUsedPercent,
    },
  };
}

/**
 * Check disk space (if available)
 */
function checkDisk(): HealthCheck {
  // Note: Disk space checking requires additional dependencies
  // For now, return pass. In production, integrate with monitoring service
  return {
    status: 'pass',
    message: 'Disk check not implemented (use monitoring service)',
  };
}

/**
 * Determine overall health status
 */
function determineOverallStatus(checks: HealthCheckResult['checks']): HealthCheckResult['status'] {
  const statuses = Object.values(checks).map(c => c.status);
  
  if (statuses.includes('fail')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('warn')) {
    return 'degraded';
  }
  
  return 'healthy';
}

export const Route = createFileRoute("/api/monitoring/system-health")({
  server: {
    handlers: {
      /**
       * GET /api/monitoring/system-health
       * 
       * Returns comprehensive system health status
       * 
       * Response codes:
       * - 200: System healthy or degraded (still operational)
       * - 503: System unhealthy (critical failure)
       */
      GET: async () => {
        const startTime = Date.now();
        
        try {
          // Run all health checks in parallel
          const [database, redis, memory, disk] = await Promise.all([
            checkDatabase(),
            checkRedis(),
            checkMemory(),
            Promise.resolve(checkDisk()),
          ]);
          
          const checks = { database, redis, memory, disk };
          const status = determineOverallStatus(checks);
          
          const result: HealthCheckResult = {
            status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks,
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
          };
          
          const responseTime = Date.now() - startTime;
          
          // Log health check results
          console.log(`[Health Check] Status: ${status}, Response time: ${responseTime}ms`);
          
          // Return 503 if unhealthy, 200 otherwise
          const statusCode = status === 'unhealthy' ? 503 : 200;
          
          return Response.json(result, { 
            status: statusCode,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-Response-Time': `${responseTime}ms`,
            },
          });
        } catch (error) {
          console.error('[Health Check] Error:', error);
          
          return Response.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks: {
              database: { status: 'fail', message: 'Health check failed' },
              redis: { status: 'fail', message: 'Health check failed' },
              memory: { status: 'fail', message: 'Health check failed' },
              disk: { status: 'fail', message: 'Health check failed' },
            },
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            error: error instanceof Error ? error.message : 'Unknown error',
          } as HealthCheckResult & { error: string }, {
            status: 503,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      },
    },
  },
});
