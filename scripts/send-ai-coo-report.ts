/**
 * Generate and Send AI COO Comprehensive Report
 *
 * Email to: eric.giraud@epic.dm
 * SMS to: +17672958382
 */

import 'dotenv/config';
import { readFileSync } from 'fs';

// Direct SMTP2GO API implementation (bypassing privateEnv issues)
const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY || '';
const SMTP2GO_SENDER_EMAIL = process.env.SMTP2GO_SENDER_EMAIL || 'noreply@epic.dm';

async function sendEmailViaSMTP2GO(
  to: string,
  subject: string,
  textBody: string,
  htmlBody?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!SMTP2GO_API_KEY) {
      throw new Error('SMTP2GO_API_KEY not configured');
    }

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': SMTP2GO_API_KEY,
      },
      body: JSON.stringify({
        api_key: SMTP2GO_API_KEY,
        to: [to],
        sender: SMTP2GO_SENDER_EMAIL,
        subject,
        text_body: textBody,
        html_body: htmlBody,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.data.failed > 0) {
      throw new Error(JSON.stringify(data));
    }

    return {
      success: true,
      messageId: data.request_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Sanitize SMS message for Epic Gateway
 * CRITICAL: The + symbol breaks MD5 signature calculation
 */
function sanitizeSMSMessage(message: string): string {
  return message
    .replace(/\+/g, ' plus ') // Replace + with " plus "
    .replace(/90\s+plus\s+days/gi, 'over 90 days') // Fix common pattern
    .replace(/(\d+)\s+plus\s+days/gi, 'over $1 days') // Fix "X+ days" pattern
    .trim();
}

async function sendSMSViaEpicGateway(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const username = 'smsapi_19905e5b';
    const password = 'a3Q9VOE0eoT4YAQ6pckg';
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    // CRITICAL: Sanitize message - + symbol breaks MD5 signature
    const sanitizedMessage = sanitizeSMSMessage(message);

    console.log('   [DEBUG] Sending to Epic SMS Gateway...');
    console.log('   [DEBUG] Endpoint: https://818.epic.dm/app/sms/api.php');
    console.log('   [DEBUG] Destination:', to);
    console.log('   [DEBUG] Message sanitized:', message !== sanitizedMessage);

    // Match exact curl example format - no extra fields
    const response = await fetch('https://818.epic.dm/app/sms/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        message: sanitizedMessage,
        phoneNumbers: [to],
      }),
    });

    console.log('   [DEBUG] Response status:', response.status);
    const data = await response.json();
    console.log('   [DEBUG] Response data:', JSON.stringify(data, null, 2));

    if (!response.ok || !data.success) {
      throw new Error(data.message || JSON.stringify(data));
    }

    return {
      success: true,
      messageId: data.results?.[0]?.to || 'sent',
    };
  } catch (error) {
    console.error('   [DEBUG] SMS Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function generateAndSendReport() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║       AI COO Comprehensive Report Generator               ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Read the comprehensive reports
  const capabilitiesReport = readFileSync('AI_COO_CAPABILITIES_REPORT.md', 'utf-8');
  const json2Report = readFileSync('ODOO_JSON2_TEST_REPORT.md', 'utf-8');

  // Generate HTML email body
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      color: #667eea;
      margin-top: 0;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .metric {
      display: inline-block;
      background: #f0f4ff;
      padding: 15px 25px;
      border-radius: 8px;
      margin: 10px 10px 10px 0;
      border-left: 4px solid #667eea;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #667eea;
      margin-top: 5px;
    }
    .alert {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .critical {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
    }
    .success {
      background: #d4edda;
      border-left: 4px solid #28a745;
    }
    .insight {
      background: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
      font-style: italic;
    }
    .action-item {
      padding: 12px;
      margin: 8px 0;
      background: #e7f3ff;
      border-left: 4px solid #2196F3;
      border-radius: 4px;
    }
    ul {
      padding-left: 20px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 8px;
    }
    .badge-success { background: #28a745; color: white; }
    .badge-warning { background: #ffc107; color: #333; }
    .badge-danger { background: #dc3545; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 AI COO System Report</h1>
    <p>Comprehensive Analysis & Capabilities Verification</p>
    <p>Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="section">
    <h2>📊 Executive Summary</h2>
    <div class="success">
      <strong>✅ SYSTEM STATUS: FULLY OPERATIONAL</strong>
      <p>All 13 real-world AI COO scenarios tested successfully. The system has complete access to your Odoo data and can perform all required daily operations.</p>
    </div>

    <div class="metric">
      <div class="metric-label">Test Success Rate</div>
      <div class="metric-value">100%</div>
    </div>

    <div class="metric">
      <div class="metric-label">Scenarios Tested</div>
      <div class="metric-value">13/13</div>
    </div>

    <div class="metric">
      <div class="metric-label">Execution Time</div>
      <div class="metric-value">2.21s</div>
    </div>
  </div>

  <div class="section">
    <h2>🚨 Critical Findings Requiring Immediate Attention</h2>

    <div class="alert critical">
      <strong>⚠️ CRITICAL: 90+ Day Receivables</strong>
      <ul>
        <li><strong>$31,730.16</strong> in invoices overdue 90+ days (97.9% of total overdue)</li>
        <li>37 total overdue invoices = $32,414.11</li>
        <li>5 customers with multiple overdue invoices</li>
      </ul>
      <div class="action-item">
        <strong>Recommended Action:</strong> Immediate collection effort on 90+ day bucket. AI can auto-schedule follow-up calls and emails.
      </div>
    </div>

    <div class="alert critical">
      <strong>⚠️ CRITICAL: Activity Completion Breakdown</strong>
      <ul>
        <li>197 scheduled activities across all departments</li>
        <li><strong>100% are overdue</strong> (all 197)</li>
        <li>0 activities scheduled for future dates</li>
      </ul>
      <div class="action-item">
        <strong>Recommended Action:</strong> Immediate team training on activity management. AI can notify all assignees and managers.
      </div>
    </div>

    <div class="alert">
      <strong>⚠️ WARNING: Stalled Sales Pipeline</strong>
      <ul>
        <li>49 deals stalled (no activity in 7+ days)</li>
        <li>$18,699.50 in potential revenue at risk</li>
        <li>86% of pipeline is inactive</li>
      </ul>
      <div class="action-item">
        <strong>Recommended Action:</strong> AI can auto-create follow-up tasks for all sales reps today.
      </div>
    </div>

    <div class="alert">
      <strong>⚠️ WARNING: Payment vs Sales Conflict</strong>
      <ul>
        <li>18 customers have BOTH open sales opportunities AND overdue invoices</li>
        <li>Top conflict: Raffoul & Co owes $4,186 (3 invoices) + has active deal</li>
      </ul>
      <div class="action-item">
        <strong>Recommended Action:</strong> Require payment plans before closing new deals with these customers.
      </div>
    </div>
  </div>

  <div class="section">
    <h2>💰 Finance Department Analysis</h2>

    <h3>Accounts Receivable Aging</h3>
    <div style="margin: 20px 0;">
      <div class="metric">
        <div class="metric-label">0-30 Days</div>
        <div class="metric-value" style="color: #28a745;">$0.00</div>
      </div>
      <div class="metric">
        <div class="metric-label">31-60 Days</div>
        <div class="metric-value" style="color: #ffc107;">$683.95</div>
      </div>
      <div class="metric">
        <div class="metric-label">61-90 Days</div>
        <div class="metric-value" style="color: #ff9800;">$0.00</div>
      </div>
      <div class="metric">
        <div class="metric-label">90+ Days</div>
        <div class="metric-value" style="color: #dc3545;">$31,730.16</div>
      </div>
    </div>

    <h3>Top 5 Problem Customers (Multiple Overdue)</h3>
    <ul>
      <li><strong>Heaven Sent Soaps:</strong> 2 invoices, $5,824.10 total</li>
      <li><strong>Raffoul & Co (1985) LTD:</strong> 3 invoices, $4,186.00 total</li>
      <li><strong>Test:</strong> 5 invoices, $3,665.00 total</li>
      <li><strong>Dominica Coconut Products:</strong> 3 invoices, $1,092.35 total</li>
      <li><strong>L.A. Dupigny & Co. Ltd.:</strong> 2 invoices, $885.00 total</li>
    </ul>

    <div class="insight">
      💡 <strong>AI Insight:</strong> "97.9% of overdue AR is 90+ days old, indicating collection process needs strengthening. Consider implementing automated reminder sequences at 15, 30, 60, and 90 days."
    </div>
  </div>

  <div class="section">
    <h2>📈 Sales Department Analysis</h2>

    <h3>Pipeline by Stage</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f0f4ff; border-bottom: 2px solid #667eea;">
          <th style="padding: 12px; text-align: left;">Stage</th>
          <th style="padding: 12px; text-align: right;">Deals</th>
          <th style="padding: 12px; text-align: right;">Total Value</th>
          <th style="padding: 12px; text-align: right;">Avg Deal</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px;"><span class="badge badge-success">Won</span></td>
          <td style="padding: 10px; text-align: right;">16</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">$14,429.50</td>
          <td style="padding: 10px; text-align: right;">$902</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px;"><span class="badge badge-warning">Proposition</span></td>
          <td style="padding: 10px; text-align: right;">8</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">$2,550.00</td>
          <td style="padding: 10px; text-align: right;">$319</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px;"><span class="badge">New</span></td>
          <td style="padding: 10px; text-align: right;">26</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">$1,475.00</td>
          <td style="padding: 10px; text-align: right;">$57</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px;"><span class="badge badge-danger">On-Hold</span></td>
          <td style="padding: 10px; text-align: right;">2</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">$220.00</td>
          <td style="padding: 10px; text-align: right;">$110</td>
        </tr>
        <tr>
          <td style="padding: 10px;">Qualified</td>
          <td style="padding: 10px; text-align: right;">5</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">$25.00</td>
          <td style="padding: 10px; text-align: right;">$5</td>
        </tr>
      </tbody>
    </table>

    <div class="insight">
      💡 <strong>AI Insight:</strong> "57% of deals stuck in 'New' stage with average value of only $57. This suggests lead qualification issues. 'Proposition' stage shows 8x higher value ($319 avg), indicating good filtering once qualified."
    </div>
  </div>

  <div class="section">
    <h2>📋 Projects Department Analysis</h2>

    <div class="metric">
      <div class="metric-label">Overdue Tasks</div>
      <div class="metric-value" style="color: #dc3545;">100</div>
    </div>

    <div class="metric">
      <div class="metric-label">Active Projects</div>
      <div class="metric-value">50</div>
    </div>

    <div class="alert">
      <strong>⚠️ Priority Management Issue:</strong> 94% of overdue tasks (94 out of 100) have no priority set. This indicates task management process needs standardization.
    </div>

    <h3>Top Active Projects</h3>
    <ul>
      <li><strong>Clim8 - odoo Implementation:</strong> 13 tasks</li>
      <li><strong>Clifftop - IPPBX:</strong> 9 tasks</li>
      <li><strong>Clim8 Outstanding Issues:</strong> 8 tasks</li>
    </ul>
  </div>

  <div class="section">
    <h2>🏭 Operations Department Analysis</h2>

    <div class="success">
      <strong>✅ Inventory Status: Healthy</strong>
      <p>42 products tracked, 0 items with low stock (<5 units). No immediate restocking needed.</p>
    </div>

    <div class="alert">
      <strong>⚠️ Pricing Gaps:</strong> 11 products (26%) are missing price information. Average product price: $52.74 (range: $1 - $384)
    </div>
  </div>

  <div class="section">
    <h2>🔗 Cross-Department Insights</h2>

    <h3>Sales + Finance Integration</h3>
    <p><strong>18 customers</strong> have both open sales opportunities AND overdue invoices. This represents a payment risk that sales team should address before closing new deals.</p>

    <h3>Sales + Projects Integration</h3>
    <p><strong>27 customers</strong> (27% of total) have both active sales orders and ongoing projects, indicating good sales-to-delivery conversion.</p>

    <h3>Communications Overview</h3>
    <div class="critical">
      <strong>⚠️ CRITICAL: Activity Breakdown</strong>
      <ul>
        <li>197 total activities scheduled</li>
        <li>197 are overdue (100%)</li>
        <li>146 project tasks (74%)</li>
        <li>17 sales follow-ups (9%)</li>
        <li>14 HR appraisals (7%)</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>✅ Verified AI COO Capabilities</h2>

    <p>The AI COO system has been tested and verified to perform all daily operations:</p>

    <ul>
      <li>✅ <strong>Identify overdue invoices</strong> and calculate AR aging buckets</li>
      <li>✅ <strong>Find stalled sales opportunities</strong> (no activity 7+ days)</li>
      <li>✅ <strong>Monitor inventory levels</strong> and flag low stock</li>
      <li>✅ <strong>Track project deadlines</strong> and overdue tasks</li>
      <li>✅ <strong>Analyze cross-department patterns</strong> (sales + finance conflicts)</li>
      <li>✅ <strong>Generate actionable insights</strong> from business data</li>
      <li>✅ <strong>Recommend specific follow-up actions</strong></li>
      <li>✅ <strong>Auto-create tasks and activities</strong> (when enabled)</li>
    </ul>
  </div>

  <div class="section">
    <h2>🎯 Immediate Recommended Actions (Next 24 Hours)</h2>

    <ol>
      <li><strong>Finance:</strong> Initiate collection campaign on 90+ day receivables ($31,730). Start with top 5 customers.</li>
      <li><strong>Sales:</strong> Schedule follow-ups for 49 stalled deals (AI can auto-create tasks).</li>
      <li><strong>All Departments:</strong> Complete or reschedule all 197 overdue activities.</li>
      <li><strong>Sales + Finance:</strong> Review 18 customers with payment issues before closing new deals.</li>
      <li><strong>Projects:</strong> Set priority levels for 94 tasks missing priority classification.</li>
      <li><strong>Operations:</strong> Update pricing for 11 products missing price information.</li>
    </ol>
  </div>

  <div class="section">
    <h2>📊 System Performance</h2>

    <table style="width: 100%; border-collapse: collapse;">
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;"><strong>Test Execution Time</strong></td>
        <td style="padding: 10px; text-align: right;">2.21 seconds</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;"><strong>Scenarios Tested</strong></td>
        <td style="padding: 10px; text-align: right;">13/13 passed (100%)</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;"><strong>Departments Analyzed</strong></td>
        <td style="padding: 10px; text-align: right;">5 (Finance, Sales, Operations, Projects, Communications)</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;"><strong>Odoo API Connection</strong></td>
        <td style="padding: 10px; text-align: right;"><span class="badge badge-success">ACTIVE</span></td>
      </tr>
      <tr>
        <td style="padding: 10px;"><strong>Dashboard Status</strong></td>
        <td style="padding: 10px; text-align: right;"><span class="badge badge-success">READY TO BUILD</span></td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p><strong>AI COO System</strong> | Epic Communications Inc.</p>
    <p>Generated automatically on ${new Date().toLocaleString()}</p>
    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      This report was generated by AI COO automated analysis system.<br>
      For questions or concerns, contact your system administrator.
    </p>
  </div>
</body>
</html>
  `;

  // Generate plain text version
  const textBody = `
AI COO COMPREHENSIVE SYSTEM REPORT
===================================
Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
-----------------
✅ SYSTEM STATUS: FULLY OPERATIONAL
All 13 real-world AI COO scenarios tested successfully.
Success Rate: 100% (13/13)
Execution Time: 2.21 seconds

CRITICAL FINDINGS REQUIRING IMMEDIATE ATTENTION
------------------------------------------------

🚨 CRITICAL: 90+ Day Receivables
   • $31,730.16 in invoices overdue 90+ days (97.9% of total overdue)
   • 37 total overdue invoices = $32,414.11
   • 5 customers with multiple overdue invoices

   ACTION: Immediate collection effort needed

🚨 CRITICAL: Activity Completion Breakdown
   • 197 scheduled activities across all departments
   • 100% are overdue (all 197)
   • 0 activities scheduled for future dates

   ACTION: Team training required

⚠️  WARNING: Stalled Sales Pipeline
   • 49 deals stalled (no activity in 7+ days)
   • $18,699.50 in potential revenue at risk
   • 86% of pipeline is inactive

   ACTION: Auto-create follow-up tasks today

⚠️  WARNING: Payment vs Sales Conflict
   • 18 customers have BOTH open opportunities AND overdue invoices
   • Top conflict: Raffoul & Co owes $4,186 + has active deal

   ACTION: Require payment before closing new deals

FINANCE DEPARTMENT
------------------
AR Aging Breakdown:
  0-30 days:    $0.00
  31-60 days:   $683.95
  61-90 days:   $0.00
  90+ days:     $31,730.16  ⚠️ CRITICAL

Top 5 Problem Customers:
  1. Heaven Sent Soaps: 2 invoices, $5,824.10
  2. Raffoul & Co: 3 invoices, $4,186.00
  3. Test: 5 invoices, $3,665.00
  4. Dominica Coconut Products: 3 invoices, $1,092.35
  5. L.A. Dupigny & Co.: 2 invoices, $885.00

SALES DEPARTMENT
----------------
Pipeline Distribution:
  Won (16 deals):          $14,429.50 (avg $902)
  Proposition (8 deals):   $2,550.00 (avg $319)
  New (26 deals):          $1,475.00 (avg $57)
  On-Hold (2 deals):       $220.00 (avg $110)
  Qualified (5 deals):     $25.00 (avg $5)

Stalled Deals: 49 deals, $18,699.50 at risk

PROJECTS DEPARTMENT
-------------------
  Overdue Tasks: 100
  Active Projects: 50
  94% of tasks missing priority classification

Top Projects:
  • Clim8 - odoo Implementation: 13 tasks
  • Clifftop - IPPBX: 9 tasks
  • Clim8 Outstanding Issues: 8 tasks

OPERATIONS DEPARTMENT
---------------------
  Products Tracked: 42
  Low Stock Items: 0 ✅
  Products Missing Prices: 11 (26%)
  Average Price: $52.74

CROSS-DEPARTMENT INSIGHTS
--------------------------
  • 18 customers with payment risk (have deals + owe money)
  • 27 customers with sales + active projects (27% conversion)
  • 197 activities 100% overdue (process breakdown)

IMMEDIATE ACTIONS (NEXT 24 HOURS)
----------------------------------
1. Finance: Collection campaign on 90+ day receivables
2. Sales: Follow-ups for 49 stalled deals
3. All: Complete/reschedule 197 overdue activities
4. Sales+Finance: Review 18 payment risk customers
5. Projects: Set priorities for 94 tasks
6. Operations: Update 11 missing prices

SYSTEM STATUS
-------------
  Test Success: 13/13 (100%)
  Execution Time: 2.21 seconds
  Odoo Connection: ACTIVE
  Dashboard: READY TO BUILD

---
Generated: ${new Date().toLocaleString()}
AI COO System | Epic Communications Inc.
  `;

  // Send email
  console.log('\n📧 Sending comprehensive report via email...');
  console.log('   To: eric.giraud@epic.dm');

  const emailResult = await sendEmailViaSMTP2GO(
    'eric.giraud@epic.dm',
    '🤖 AI COO System Report - Full Analysis & Critical Alerts',
    textBody,
    htmlBody
  );

  if (emailResult.success) {
    console.log('   ✅ Email sent successfully!');
    console.log(`   📨 Message ID: ${emailResult.messageId}`);
  } else {
    console.error('   ❌ Email failed:', emailResult.error);
    process.exit(1);
  }

  // Send SMS notification
  console.log('\n📱 Sending SMS notification via Epic Gateway...');
  console.log('   To: 17672859610');

  // IMPORTANT: Remove + symbol - it breaks MD5 signature in aislecom gateway
  const smsMessage = `AI COO Report sent to eric.giraud@epic.dm

CRITICAL ALERTS:
• $31.7K overdue over 90 days
• 49 stalled deals ($18.7K)
• 197 activities overdue (100%)

Check email for full report.

- AI COO System`;

  const smsResult = await sendSMSViaEpicGateway(
    '17672859610',
    smsMessage
  );

  if (smsResult.success) {
    console.log('   ✅ SMS sent successfully!');
    console.log(`   📨 Message ID: ${smsResult.messageId}`);
  } else {
    console.error('   ❌ SMS failed:', smsResult.error);
  }

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ REPORT DELIVERY COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📧 Email: ${emailResult.success ? 'Delivered' : 'Failed'}`);
  console.log(`📱 SMS: ${smsResult.success ? 'Delivered' : 'Failed'}`);
  console.log(`⏰ Timestamp: ${new Date().toLocaleString()}\n`);
}

generateAndSendReport().catch(console.error);
