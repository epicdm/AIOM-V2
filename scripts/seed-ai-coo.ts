import { database } from '../src/db';
import { monitoringJobs } from '../src/db/ai-coo-schema';
import { nanoid } from 'nanoid';

async function seedAICOO() {
  try {
    console.log('Seeding AI COO monitoring jobs...');
    
    // Check if job already exists
    const existing = await database.select().from(monitoringJobs);
    
    if (existing.length > 0) {
      console.log('Monitoring jobs already exist:', existing.map(j => j.name).join(', '));
      console.log('✅ Seed complete (jobs already exist)');
      process.exit(0);
      return;
    }
    
    // Create financial monitoring job
    await database.insert(monitoringJobs).values({
      id: nanoid(),
      name: 'Financial Health Check',
      description: 'Hourly analysis of AR, AP, cash position, and runway',
      schedule: '0 * * * *', // Every hour at minute 0
      analyzerType: 'financial',
      config: {
        thresholds: {
          cashRunwayDays: 60,           // Alert if cash runway < 60 days
          ar60PlusDaysPercent: 30,      // Alert if >30% of AR is 60+ days old
          ar90PlusDaysAmount: 50000,    // Alert if 90+ day AR exceeds $50k
          ap90PlusDaysAmount: 25000,    // Alert if 90+ day AP exceeds $25k
          workingCapitalMin: 0,         // Alert if working capital is negative
        },
      },
      enabled: true,
    });
    
    console.log('✅ Created Financial Health Check job');
    console.log('   Schedule: Every hour');
    console.log('   Thresholds:');
    console.log('     - Cash runway: 60 days minimum');
    console.log('     - AR 60+ days: Max 30%');
    console.log('     - AR 90+ days: Max $50,000');
    console.log('     - AP 90+ days: Max $25,000');
    console.log('     - Working capital: Must be positive');
    
    console.log('\n✅ AI COO seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedAICOO();
