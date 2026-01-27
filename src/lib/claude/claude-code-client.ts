/**
 * Claude Code Client - Uses Claude Code subscription instead of API
 *
 * This client allows your app to use your $200 Claude Code subscription
 * during development instead of paying for separate API calls.
 *
 * How it works:
 * 1. App writes analysis request to file
 * 2. Claude Code picks it up and processes it
 * 3. Result written back to file
 * 4. App reads the result
 *
 * Usage:
 *   const client = new ClaudeCodeClient();
 *   const result = await client.analyze(prompt);
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

const TASKS_DIR = path.join(process.cwd(), '.claude-tasks');
const RESULTS_DIR = path.join(process.cwd(), '.claude-results');

export class ClaudeCodeClient {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    // Create directories
    await fs.mkdir(TASKS_DIR, { recursive: true });
    await fs.mkdir(RESULTS_DIR, { recursive: true });

    this.initialized = true;
  }

  /**
   * Send a prompt to Claude Code for processing
   * Uses your $200 subscription instead of API!
   */
  async analyze(prompt: string, options?: {
    timeout?: number;
    useCase?: string;
  }): Promise<{ response: string; tokensUsed: number; cost: number }> {
    await this.initialize();

    const taskId = nanoid();
    const taskFile = path.join(TASKS_DIR, `${taskId}.json`);
    const resultFile = path.join(RESULTS_DIR, `${taskId}.json`);

    // Write task
    await fs.writeFile(taskFile, JSON.stringify({
      id: taskId,
      prompt: prompt,
      useCase: options?.useCase || 'general',
      timestamp: new Date().toISOString(),
    }, null, 2));

    console.log(`[Claude Code Client] Task created: ${taskId}`);
    console.log(`[Claude Code Client] Waiting for Claude Code to process...`);
    console.log(`[Claude Code Client] (Make sure Claude Code daemon is running)`);

    // Wait for result
    const timeout = options?.timeout || 60000; // 60 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await fs.readFile(resultFile, 'utf8');
        const data = JSON.parse(result);

        // Clean up
        await fs.unlink(taskFile).catch(() => {});
        await fs.unlink(resultFile).catch(() => {});

        console.log(`[Claude Code Client] ✅ Response received (${data.duration}ms)`);

        return {
          response: data.response,
          tokensUsed: data.tokensUsed || 0,
          cost: 0, // Using subscription, not API!
        };
      } catch (error) {
        // File doesn't exist yet, keep waiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Claude Code processing timeout after ${timeout}ms. Is the daemon running?`);
  }

  /**
   * Check if Claude Code daemon is running
   */
  async isDaemonRunning(): Promise<boolean> {
    await this.initialize();

    const testId = `health-check-${Date.now()}`;
    const taskFile = path.join(TASKS_DIR, `${testId}.json`);

    try {
      await fs.writeFile(taskFile, JSON.stringify({ test: true }));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // If daemon is running, it should have picked this up
      const exists = await fs.access(taskFile).then(() => true).catch(() => false);

      // Clean up
      await fs.unlink(taskFile).catch(() => {});

      return !exists; // If file was deleted, daemon is running
    } catch (error) {
      return false;
    }
  }

  /**
   * Financial analysis using Claude Code subscription
   */
  async analyzeFinancialData(data: {
    ar: any;
    ap: any;
    bank: any;
  }): Promise<any> {
    const prompt = `You are a financial analyst. Analyze this data and provide insights:

ACCOUNTS RECEIVABLE:
${JSON.stringify(data.ar, null, 2)}

ACCOUNTS PAYABLE:
${JSON.stringify(data.ap, null, 2)}

BANK BALANCE:
${JSON.stringify(data.bank, null, 2)}

Provide structured insights in JSON format with:
- Key findings
- Alerts (if any)
- Recommended actions
`;

    const result = await this.analyze(prompt, {
      useCase: 'financial_analysis',
      timeout: 90000,
    });

    return JSON.parse(result.response);
  }

  /**
   * Generate action recommendations using Claude Code subscription
   */
  async generateActionRecommendations(analysisResult: any): Promise<any[]> {
    const prompt = `Based on this financial analysis, generate action recommendations:

${JSON.stringify(analysisResult, null, 2)}

For each recommendation, provide:
- Action type
- Priority
- Reasoning
- Risk level
- Expected impact

Return as JSON array.`;

    const result = await this.analyze(prompt, {
      useCase: 'action_recommendations',
      timeout: 90000,
    });

    return JSON.parse(result.response);
  }
}
