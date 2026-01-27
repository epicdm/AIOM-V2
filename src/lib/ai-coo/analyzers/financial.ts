/**
 * Financial Health Analyzer
 *
 * Analyzes financial data from Odoo and generates insights using AI
 */

import { nanoid } from 'nanoid';
import { getClaudeSDKClient } from '~/lib/claude/sdk-client';
import { createAnalysisResult, createAlert } from '~/data-access/ai-coo';

// Data source configuration
// NOW USING REAL ODOO DATA!
import { getFinancialSnapshot } from '../data-fetchers/financial';

import { recommendActions } from '../action-recommender';

// Best practice thresholds
const DEFAULT_THRESHOLDS = {
  cashRunwayDays: 60,           // Minimum 60 days cash runway
  ar60PlusDaysPercent: 30,      // Max 30% of AR over 60 days
  ar90PlusDaysAmount: 50000,    // Alert if 90+ days AR exceeds $50k
  ap90PlusDaysAmount: 25000,    // Alert if 90+ days AP exceeds $25k
  workingCapitalMin: 0,         // Working capital should be positive
};

export async function runFinancialAnalysis(job: any) {
  const startTime = Date.now();
  
  try {
    console.log('[Financial Analyzer] Starting analysis...');
    
    // 1. Fetch financial data from Odoo
    const snapshot = await getFinancialSnapshot();
    
    // 2. Get thresholds from job config or use defaults
    const thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...(job.config?.thresholds || {}),
    };
    
    // 3. Use AI to analyze and generate insights
    const claude = getClaudeSDKClient();
    
    const prompt = `You are a financial analyst for a business. Analyze this financial data and provide structured insights.

ACCOUNTS RECEIVABLE:
- Total: $${snapshot.ar.total.toFixed(2)}
- Current (0-30 days): $${snapshot.ar.current.toFixed(2)} (${((snapshot.ar.current / snapshot.ar.total) * 100).toFixed(1)}%)
- 31-60 days: $${snapshot.ar.days30.toFixed(2)} (${((snapshot.ar.days30 / snapshot.ar.total) * 100).toFixed(1)}%)
- 61-90 days: $${snapshot.ar.days60.toFixed(2)} (${((snapshot.ar.days60 / snapshot.ar.total) * 100).toFixed(1)}%)
- 90+ days: $${snapshot.ar.days90plus.toFixed(2)} (${((snapshot.ar.days90plus / snapshot.ar.total) * 100).toFixed(1)}%)
- Top 5 overdue invoices: ${JSON.stringify(snapshot.ar.invoices.slice(0, 5))}

ACCOUNTS PAYABLE:
- Total: $${snapshot.ap.total.toFixed(2)}
- Current (0-30 days): $${snapshot.ap.current.toFixed(2)} (${((snapshot.ap.current / snapshot.ap.total) * 100).toFixed(1)}%)
- 31-60 days: $${snapshot.ap.days30.toFixed(2)} (${((snapshot.ap.days30 / snapshot.ap.total) * 100).toFixed(1)}%)
- 61-90 days: $${snapshot.ap.days60.toFixed(2)} (${((snapshot.ap.days60 / snapshot.ap.total) * 100).toFixed(1)}%)
- 90+ days: $${snapshot.ap.days90plus.toFixed(2)} (${((snapshot.ap.days90plus / snapshot.ap.total) * 100).toFixed(1)}%)

CASH POSITION:
- Bank balance: $${snapshot.bank.total.toFixed(2)}
- Monthly burn rate: $${snapshot.monthlyBurn.toFixed(2)}
- Cash runway: ${snapshot.cashRunwayDays.toFixed(1)} days (${snapshot.cashRunwayMonths.toFixed(1)} months)
- Net position: $${snapshot.netPosition.toFixed(2)}
- Working capital: $${snapshot.workingCapital.toFixed(2)}

Provide insights in this JSON format (respond ONLY with valid JSON, no markdown):
{
  "insights": [
    {
      "metric": "cash_runway_days",
      "value": ${snapshot.cashRunwayDays.toFixed(1)},
      "label": "Cash Runway",
      "trend": "stable",
      "severity": "${snapshot.cashRunwayDays < thresholds.cashRunwayDays ? 'critical' : 'good'}"
    },
    {
      "metric": "ar_total",
      "value": ${snapshot.ar.total.toFixed(2)},
      "label": "Total Receivables",
      "trend": "stable",
      "severity": "good"
    },
    {
      "metric": "ar_60plus_percent",
      "value": ${(((snapshot.ar.days60 + snapshot.ar.days90plus) / snapshot.ar.total) * 100).toFixed(1)},
      "label": "AR Over 60 Days (%)",
      "trend": "stable",
      "severity": "${(((snapshot.ar.days60 + snapshot.ar.days90plus) / snapshot.ar.total) * 100) > thresholds.ar60PlusDaysPercent ? 'warning' : 'good'}"
    },
    {
      "metric": "working_capital",
      "value": ${snapshot.workingCapital.toFixed(2)},
      "label": "Working Capital",
      "trend": "stable",
      "severity": "${snapshot.workingCapital < 0 ? 'warning' : 'good'}"
    }
  ],
  "summary": "Brief 2-3 sentence executive summary of financial health",
  "concerns": ["List any concerning findings"],
  "recommendations": ["List recommended actions"]
}`;
    
    const response = await claude.complete(prompt, {
      useCase: 'financial_analysis',
      maxTokens: 2048,
    });
    
    // Parse AI response (handle potential markdown wrapping)
    let analysis;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[Financial Analyzer] Failed to parse AI response:', response);
      throw new Error('Failed to parse AI analysis response');
    }
    
    // 4. Detect alerts based on thresholds
    const alerts = [];
    
    // Cash runway alert
    if (snapshot.cashRunwayDays < thresholds.cashRunwayDays) {
      alerts.push({
        id: nanoid(),
        type: 'financial',
        priority: snapshot.cashRunwayDays < 30 ? 'critical' : 'high',
        title: 'Low Cash Runway',
        description: `Cash runway is ${snapshot.cashRunwayDays.toFixed(1)} days (threshold: ${thresholds.cashRunwayDays} days). Monthly burn: $${snapshot.monthlyBurn.toFixed(2)}`,
        data: {
          cashRunwayDays: snapshot.cashRunwayDays,
          monthlyBurn: snapshot.monthlyBurn,
          bankBalance: snapshot.bank.total,
          threshold: thresholds.cashRunwayDays,
        },
      });
    }
    
    // AR aging alert
    const ar60Plus = snapshot.ar.days60 + snapshot.ar.days90plus;
    const ar60PlusPercent = (ar60Plus / snapshot.ar.total) * 100;
    
    if (ar60PlusPercent > thresholds.ar60PlusDaysPercent) {
      alerts.push({
        id: nanoid(),
        type: 'financial',
        priority: ar60PlusPercent > 50 ? 'high' : 'medium',
        title: 'High Overdue Receivables',
        description: `${ar60PlusPercent.toFixed(1)}% of AR is over 60 days old ($${ar60Plus.toFixed(2)}). Threshold: ${thresholds.ar60PlusDaysPercent}%`,
        data: {
          amount: ar60Plus,
          percentage: ar60PlusPercent,
          threshold: thresholds.ar60PlusDaysPercent,
          topInvoices: snapshot.ar.invoices.filter(i => i.daysOverdue > 60).slice(0, 10),
        },
      });
    }
    
    // AR 90+ days alert
    if (snapshot.ar.days90plus > thresholds.ar90PlusDaysAmount) {
      alerts.push({
        id: nanoid(),
        type: 'financial',
        priority: 'high',
        title: 'Critical Overdue Receivables',
        description: `$${snapshot.ar.days90plus.toFixed(2)} in 90+ day receivables (threshold: $${thresholds.ar90PlusDaysAmount})`,
        data: {
          amount: snapshot.ar.days90plus,
          threshold: thresholds.ar90PlusDaysAmount,
          invoices: snapshot.ar.invoices.filter(i => i.daysOverdue > 90).slice(0, 10),
        },
      });
    }
    
    // AP 90+ days alert
    if (snapshot.ap.days90plus > thresholds.ap90PlusDaysAmount) {
      alerts.push({
        id: nanoid(),
        type: 'financial',
        priority: 'medium',
        title: 'Overdue Payables',
        description: `$${snapshot.ap.days90plus.toFixed(2)} in 90+ day payables (threshold: $${thresholds.ap90PlusDaysAmount})`,
        data: {
          amount: snapshot.ap.days90plus,
          threshold: thresholds.ap90PlusDaysAmount,
          bills: snapshot.ap.bills.filter(b => b.daysOverdue > 90).slice(0, 10),
        },
      });
    }
    
    // Working capital alert
    if (snapshot.workingCapital < thresholds.workingCapitalMin) {
      alerts.push({
        id: nanoid(),
        type: 'financial',
        priority: 'high',
        title: 'Negative Working Capital',
        description: `Working capital is $${snapshot.workingCapital.toFixed(2)} (AR - AP). This indicates potential liquidity issues.`,
        data: {
          workingCapital: snapshot.workingCapital,
          ar: snapshot.ar.total,
          ap: snapshot.ap.total,
        },
      });
    }
    
    // 5. Store results
    const result = await createAnalysisResult({
      id: nanoid(),
      jobId: job.id,
      status: 'success',
      insights: analysis.insights,
      metrics: {
        ar: snapshot.ar,
        ap: snapshot.ap,
        bank: snapshot.bank,
        monthlyBurn: snapshot.monthlyBurn,
        cashRunwayDays: snapshot.cashRunwayDays,
        cashRunwayMonths: snapshot.cashRunwayMonths,
        netPosition: snapshot.netPosition,
        workingCapital: snapshot.workingCapital,
        summary: analysis.summary,
        concerns: analysis.concerns,
        recommendations: analysis.recommendations,
      },
      alertsGenerated: alerts.length,
      durationMs: Date.now() - startTime,
      cost: '0', // Will be populated from Claude SDK usage tracking
    });
    
    // 6. Create alerts
    for (const alertData of alerts) {
      await createAlert({
        ...alertData,
        analysisResultId: result.id,
      });
    }

    // 7. Generate autonomous action recommendations
    try {
      console.log('[Financial Analyzer] Generating action recommendations...');

      const recommendations = await recommendActions({
        analysisResult: {
          id: result.id,
          jobId: job.id,
          status: 'completed',
          metrics: {
            totalReceivables: snapshot.ar.total,
            totalOverdue: snapshot.ar.days60 + snapshot.ar.days90plus,
            cashRunwayDays: snapshot.cashRunwayDays,
            avgDaysToPayment: snapshot.ar.daysToPayAvg || 30,

            // Overdue invoice buckets
            invoices_0_15_days: {
              count: snapshot.ar.invoices.filter((i) => i.daysOverdue > 0 && i.daysOverdue <= 15).length,
              total: snapshot.ar.invoices
                .filter((i) => i.daysOverdue > 0 && i.daysOverdue <= 15)
                .reduce((sum, i) => sum + i.amount, 0),
              invoices: snapshot.ar.invoices
                .filter((i) => i.daysOverdue > 0 && i.daysOverdue <= 15)
                .slice(0, 5),
            },
            invoices_15_30_days: {
              count: snapshot.ar.invoices.filter((i) => i.daysOverdue > 15 && i.daysOverdue <= 30).length,
              total: snapshot.ar.invoices
                .filter((i) => i.daysOverdue > 15 && i.daysOverdue <= 30)
                .reduce((sum, i) => sum + i.amount, 0),
              invoices: snapshot.ar.invoices
                .filter((i) => i.daysOverdue > 15 && i.daysOverdue <= 30)
                .slice(0, 5),
            },
            invoices_30_60_days: {
              count: snapshot.ar.invoices.filter((i) => i.daysOverdue > 30 && i.daysOverdue <= 60).length,
              total: snapshot.ar.invoices
                .filter((i) => i.daysOverdue > 30 && i.daysOverdue <= 60)
                .reduce((sum, i) => sum + i.amount, 0),
              invoices: snapshot.ar.invoices
                .filter((i) => i.daysOverdue > 30 && i.daysOverdue <= 60)
                .slice(0, 5),
            },
          },
          insights: [
            `Cash runway is ${snapshot.cashRunwayDays < thresholds.cashRunwayDays ? 'below' : 'at'} target (${snapshot.cashRunwayDays.toFixed(1)} days vs ${thresholds.cashRunwayDays} day target)`,
            ...analysis.concerns,
          ],
          recommendations: analysis.recommendations,
          createdAt: new Date(),
        },
        orgId: 'default-org',
        userId: 'system:ai-coo',
      });

      console.log(
        `[Financial Analyzer] Generated ${recommendations.length} action recommendations`
      );

      // Log recommended actions
      for (const rec of recommendations) {
        console.log(
          `  • ${rec.action.action_type} (${rec.priority} priority): ${rec.reasoning.substring(0, 100)}...`
        );
      }
    } catch (error) {
      console.error('[Financial Analyzer] Failed to generate action recommendations:', error);
      // Don't fail the analysis if action generation fails
      console.error('  Error details:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log(
      `[Financial Analyzer] Complete. Generated ${alerts.length} alerts in ${Date.now() - startTime}ms`
    );
    console.log(`[Financial Analyzer] Summary: ${analysis.summary}`);

    return result;
  } catch (error) {
    console.error('[Financial Analyzer] Error:', error);
    
    // Store failed result
    await createAnalysisResult({
      id: nanoid(),
      jobId: job.id,
      status: 'failed',
      insights: [],
      metrics: {},
      alertsGenerated: 0,
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}
