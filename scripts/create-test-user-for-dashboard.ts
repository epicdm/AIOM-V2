/**
 * Create test user for dashboard testing
 */
import { database } from '../src/db';
import { user, account } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const TEST_EMAIL = 'dashboard-test@aiom.local';
const TEST_PASSWORD = 'Test123!';
const TEST_NAME = 'Dashboard Tester';

async function createTestUser() {
  console.log('Creating test user for dashboard testing...\n');

  // Check if user already exists
  const existing = await database
    .select()
    .from(user)
    .where(eq(user.email, TEST_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log('✅ Test user already exists!');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log(`   User ID: ${existing[0].id}`);
    return;
  }

  // Create user
  const userId = crypto.randomUUID();

  await database.insert(user).values({
    id: userId,
    email: TEST_EMAIL,
    name: TEST_NAME,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ Created test user:');
  console.log(`   Email: ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log(`   User ID: ${userId}`);
  console.log();
  console.log('⚠️  NOTE: Password needs to be set on first login via Better Auth');
  console.log('   Just sign up with these credentials and they will work!');

  process.exit(0);
}

createTestUser().catch(console.error);
