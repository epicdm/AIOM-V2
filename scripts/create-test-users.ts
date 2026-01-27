/**
 * Create Test Users for Functional Testing
 * 
 * Creates multiple test users with different roles for comprehensive testing
 */

import { database } from '../src/db';
import { user } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_USERS = [
  {
    email: 'employee@test.aiom.local',
    name: 'Test Employee',
    role: 'employee',
  },
  {
    email: 'manager@test.aiom.local',
    name: 'Test Manager',
    role: 'manager',
  },
  {
    email: 'admin@test.aiom.local',
    name: 'Test Admin',
    role: 'admin',
  },
  {
    email: 'cs@test.aiom.local',
    name: 'Test Customer Service',
    role: 'customer_service',
  },
];

async function createTestUsers() {
  console.log('🔧 Creating test users for functional testing...\n');
  
  for (const testUser of TEST_USERS) {
    try {
      // Check if user exists
      const existing = await database
        .select()
        .from(user)
        .where(eq(user.email, testUser.email))
        .limit(1);

      if (existing.length > 0) {
        console.log(`✅ ${testUser.email} - Already exists`);
        continue;
      }

      // Create user
      await database.insert(user).values({
        id: crypto.randomUUID(),
        email: testUser.email,
        name: testUser.name,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ ${testUser.email} - Created`);
    } catch (error) {
      console.error(`❌ ${testUser.email} - Error: ${error}`);
    }
  }

  console.log('\n📝 Test Users Created!');
  console.log('\nNOTE: Users need passwords set via sign-up flow:');
  console.log('1. Go to http://localhost:3000/sign-up');
  console.log('2. Sign up with each email using password: Employee123!@# (or similar)');
  console.log('\nOR use the existing test@aiom.local user you already created.\n');
}

createTestUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
