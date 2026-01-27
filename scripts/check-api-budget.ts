/**
 * Check Claude API Budget Usage
 *
 * Run: npx tsx scripts/check-api-budget.ts
 */

import { costGuard } from '../src/lib/claude/cost-guard';

async function checkBudget() {
  console.log('💰 Claude API Budget Status\n');
  console.log('='.repeat(60));

  const stats = await costGuard.getUsageStats();

  // Daily usage
  console.log('\n📅 Daily Usage:');
  console.log(`  Used: $${stats.daily.used.toFixed(2)} / $${stats.daily.limit.toFixed(2)}`);
  console.log(`  Remaining: $${(stats.daily.limit - stats.daily.used).toFixed(2)}`);
  console.log(`  Percentage: ${stats.daily.percent.toFixed(1)}%`);

  const dailyBar = '█'.repeat(Math.floor(stats.daily.percent / 2)) + '░'.repeat(50 - Math.floor(stats.daily.percent / 2));
  console.log(`  [${dailyBar}]`);

  // Monthly usage
  console.log('\n📆 Monthly Usage:');
  console.log(`  Used: $${stats.monthly.used.toFixed(2)} / $${stats.monthly.limit.toFixed(2)}`);
  console.log(`  Remaining: $${(stats.monthly.limit - stats.monthly.used).toFixed(2)}`);
  console.log(`  Percentage: ${stats.monthly.percent.toFixed(1)}%`);

  const monthlyBar = '█'.repeat(Math.floor(stats.monthly.percent / 2)) + '░'.repeat(50 - Math.floor(stats.monthly.percent / 2));
  console.log(`  [${monthlyBar}]`);

  // Status
  console.log('\n📊 Status:');
  if (stats.monthly.percent > 90) {
    console.log('  🔴 CRITICAL: Monthly budget almost exhausted!');
  } else if (stats.monthly.percent > 80) {
    console.log('  🟡 WARNING: Approaching monthly budget limit');
  } else if (stats.monthly.percent > 50) {
    console.log('  🟠 NOTICE: Over 50% of monthly budget used');
  } else {
    console.log('  🟢 HEALTHY: Budget usage is normal');
  }

  // Cost estimates
  console.log('\n💡 Typical Costs:');
  console.log('  Financial Analysis: ~$0.01 per run');
  console.log('  Action Recommendation: ~$0.04 per action');
  console.log('  AI Chat Message: ~$0.002 per message');
  console.log('  Natural Language Query: ~$0.005 per query');

  console.log('\n📈 Projected Monthly Cost:');
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const projectedCost = (stats.monthly.used / currentDay) * daysInMonth;
  console.log(`  Based on current usage: $${projectedCost.toFixed(2)}`);

  if (projectedCost > stats.monthly.limit) {
    console.log(`  ⚠️  Warning: Projected to exceed budget by $${(projectedCost - stats.monthly.limit).toFixed(2)}`);
  } else {
    console.log(`  ✅ Within budget (${((projectedCost / stats.monthly.limit) * 100).toFixed(1)}% of limit)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Budget check complete\n');

  process.exit(0);
}

checkBudget().catch(console.error);
