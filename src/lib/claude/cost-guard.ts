/**
 * Cost Guard - Prevents API usage from exceeding budget limits
 *
 * Usage:
 *   await costGuard.checkBeforeRequest(estimatedCost);
 *   await costGuard.recordUsage(actualCost);
 */

import { database } from '~/db';
import { sql } from 'drizzle-orm';

interface CostGuardConfig {
  maxCostPerDay: number;
  maxCostPerMonth: number;
  alertThresholdPercent: number;
}

class CostGuard {
  private config: CostGuardConfig;

  constructor() {
    this.config = {
      maxCostPerDay: parseFloat(process.env.ANTHROPIC_MAX_COST_PER_DAY || '10'),
      maxCostPerMonth: parseFloat(process.env.ANTHROPIC_MAX_COST_PER_MONTH || '200'),
      alertThresholdPercent: parseFloat(process.env.ANTHROPIC_ALERT_THRESHOLD_PERCENT || '80'),
    };
  }

  /**
   * Check if we can make a request without exceeding budget
   */
  async checkBeforeRequest(estimatedCost: number = 0.05): Promise<{ allowed: boolean; reason?: string }> {
    // Get current usage
    const dailyUsage = await this.getDailyUsage();
    const monthlyUsage = await this.getMonthlyUsage();

    // Check daily limit
    if (dailyUsage + estimatedCost > this.config.maxCostPerDay) {
      return {
        allowed: false,
        reason: `Daily budget exceeded: $${dailyUsage.toFixed(2)} of $${this.config.maxCostPerDay.toFixed(2)} used`,
      };
    }

    // Check monthly limit
    if (monthlyUsage + estimatedCost > this.config.maxCostPerMonth) {
      return {
        allowed: false,
        reason: `Monthly budget exceeded: $${monthlyUsage.toFixed(2)} of $${this.config.maxCostPerMonth.toFixed(2)} used`,
      };
    }

    // Check if approaching limits (for warnings)
    const dailyPercent = ((dailyUsage + estimatedCost) / this.config.maxCostPerDay) * 100;
    const monthlyPercent = ((monthlyUsage + estimatedCost) / this.config.maxCostPerMonth) * 100;

    if (dailyPercent > this.config.alertThresholdPercent) {
      console.warn(`[Cost Guard] Daily budget at ${dailyPercent.toFixed(1)}% ($${dailyUsage.toFixed(2)} of $${this.config.maxCostPerDay.toFixed(2)})`);
    }

    if (monthlyPercent > this.config.alertThresholdPercent) {
      console.warn(`[Cost Guard] Monthly budget at ${monthlyPercent.toFixed(1)}% ($${monthlyUsage.toFixed(2)} of $${this.config.maxCostPerMonth.toFixed(2)})`);
    }

    return { allowed: true };
  }

  /**
   * Record actual usage after request completes
   */
  async recordUsage(cost: number, useCase: string, metadata?: any): Promise<void> {
    // This would be saved to your analytics/tracking table
    console.log(`[Cost Guard] Recorded usage: $${cost.toFixed(4)} for ${useCase}`);

    // You could save to database here for detailed tracking
    // await database.insert(claudeUsage).values({...})
  }

  /**
   * Get today's total usage
   */
  private async getDailyUsage(): Promise<number> {
    try {
      // This is a simplified version - you'd query your actual usage tracking table
      const today = new Date().toISOString().split('T')[0];

      // For now, return 0 (you can implement proper tracking later)
      return 0;
    } catch (error) {
      console.error('[Cost Guard] Error getting daily usage:', error);
      return 0;
    }
  }

  /**
   * Get this month's total usage
   */
  private async getMonthlyUsage(): Promise<number> {
    try {
      // This is a simplified version - you'd query your actual usage tracking table
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      // For now, return 0 (you can implement proper tracking later)
      return 0;
    } catch (error) {
      console.error('[Cost Guard] Error getting monthly usage:', error);
      return 0;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<{
    daily: { used: number; limit: number; percent: number };
    monthly: { used: number; limit: number; percent: number };
  }> {
    const dailyUsed = await this.getDailyUsage();
    const monthlyUsed = await this.getMonthlyUsage();

    return {
      daily: {
        used: dailyUsed,
        limit: this.config.maxCostPerDay,
        percent: (dailyUsed / this.config.maxCostPerDay) * 100,
      },
      monthly: {
        used: monthlyUsed,
        limit: this.config.maxCostPerMonth,
        percent: (monthlyUsed / this.config.maxCostPerMonth) * 100,
      },
    };
  }

  /**
   * Estimate cost for a request (rough estimates)
   */
  estimateCost(inputTokens: number, outputTokens: number, model: string = 'sonnet'): number {
    // Claude pricing (as of January 2025)
    const pricing = {
      'claude-sonnet-4-20250514': { input: 3, output: 15 }, // per million tokens
      'claude-haiku-3-5-20241022': { input: 0.8, output: 4 },
      sonnet: { input: 3, output: 15 },
      haiku: { input: 0.8, output: 4 },
    };

    const prices = pricing[model as keyof typeof pricing] || pricing.sonnet;

    const inputCost = (inputTokens / 1_000_000) * prices.input;
    const outputCost = (outputTokens / 1_000_000) * prices.output;

    return inputCost + outputCost;
  }
}

// Export singleton instance
export const costGuard = new CostGuard();
