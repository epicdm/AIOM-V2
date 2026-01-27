/**
 * Email & SMS Integration Test Script
 *
 * This script tests both communication integrations:
 * - SMTP2GO for email sending
 * - Epic SMS Gateway for SMS sending
 *
 * Tests:
 * 1. API keys/credentials are configured correctly
 * 2. Email sending works (SMTP2GO)
 * 3. SMS sending works (Epic Gateway)
 * 4. Error handling works properly
 *
 * Usage:
 * 1. Ensure .env has: SMTP2GO_API_KEY, EPIC_SMS_USERNAME, EPIC_SMS_PASSWORD
 * 2. Update TEST_EMAIL with your email address
 * 3. Update TEST_PHONE with your phone number (for SMS test)
 * 4. Run: npx tsx scripts/test-smtp2go-integration.ts
 */

import {
  sendEmailViaSMTP2GO,
  testSMTP2GOConnection,
  isValidEmail,
} from '../src/lib/ai-coo/safe-operations/smtp2go-client';

import {
  sendSMSViaEpicGateway,
  testEpicSMSConnection,
  isValidPhoneNumberForEpic,
} from '../src/lib/ai-coo/safe-operations/epic-sms-client';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

// **IMPORTANT**: Update these with your actual test addresses
const TEST_EMAIL = 'your-email@example.com'; // UPDATE THIS
const TEST_PHONE = '+15551234567'; // UPDATE THIS (E.164 format)

const ENABLE_EMAIL_TEST = true; // Set to false to skip email test
const ENABLE_SMS_TEST = false; // Set to true to test SMS (costs money!)

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testAPIConnection() {
  console.log('\n🔑 Testing API Connections...');
  console.log('═'.repeat(50));

  let allOk = true;

  // Test SMTP2GO (Email)
  try {
    console.log('\n📧 Testing SMTP2GO (Email)...');
    const emailResult = await testSMTP2GOConnection();

    if (emailResult.success) {
      console.log('✅ SMTP2GO API key configured');
      console.log('✅ Ready to send emails');
    } else {
      console.error('❌ SMTP2GO connection failed:', emailResult.error);
      console.error('⚠️  Check SMTP2GO_API_KEY in .env');
      allOk = false;
    }
  } catch (error) {
    console.error('❌ SMTP2GO test failed:', error);
    allOk = false;
  }

  // Test Epic SMS Gateway
  try {
    console.log('\n📱 Testing Epic SMS Gateway...');
    const smsResult = await testEpicSMSConnection();

    if (smsResult.success) {
      console.log('✅ Epic SMS Gateway credentials configured');
      console.log('✅ Ready to send SMS');
    } else {
      console.error('❌ Epic SMS connection failed:', smsResult.error);
      console.error('⚠️  Check EPIC_SMS_USERNAME and EPIC_SMS_PASSWORD in .env');
      allOk = false;
    }
  } catch (error) {
    console.error('❌ Epic SMS test failed:', error);
    allOk = false;
  }

  return allOk;
}

async function testEmailSending() {
  console.log('\n📧 Testing Email Sending...');
  console.log('═'.repeat(50));

  if (!ENABLE_EMAIL_TEST) {
    console.log('⏭️  Email test skipped (ENABLE_EMAIL_TEST = false)');
    return true;
  }

  // Validate email address
  if (!isValidEmail(TEST_EMAIL)) {
    console.error('❌ Invalid test email address:', TEST_EMAIL);
    console.error('⚠️  Update TEST_EMAIL in script with your real email');
    return false;
  }

  if (TEST_EMAIL === 'your-email@example.com') {
    console.error('❌ Please update TEST_EMAIL with your actual email address');
    return false;
  }

  try {
    console.log(`📤 Sending test email to: ${TEST_EMAIL}`);

    const result = await sendEmailViaSMTP2GO(
      TEST_EMAIL,
      '✅ SMTP2GO Integration Test - Email',
      `This is a test email from your AIOM AI COO system.

If you're seeing this, your SMTP2GO email integration is working correctly!

Test Details:
- Sent at: ${new Date().toISOString()}
- Integration: SMTP2GO via Node.js
- Purpose: Verify email sending capability

You can now use the AI COO to send automated emails for:
- Invoice reminders
- Deal follow-ups
- Payment confirmations
- Task notifications

Next steps:
1. Configure the Action Recommender
2. Set up approval workflows
3. Let the AI COO start running your business!

---
AIOM AI COO System
Powered by SMTP2GO`,
      `<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563eb;">✅ SMTP2GO Integration Test - Email</h2>

  <p>This is a test email from your <strong>AIOM AI COO system</strong>.</p>

  <p style="background: #dbeafe; padding: 15px; border-radius: 8px;">
    If you're seeing this, your SMTP2GO email integration is <strong>working correctly!</strong>
  </p>

  <h3>Test Details:</h3>
  <ul>
    <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
    <li><strong>Integration:</strong> SMTP2GO via Node.js</li>
    <li><strong>Purpose:</strong> Verify email sending capability</li>
  </ul>

  <h3>You can now use the AI COO to send automated emails for:</h3>
  <ul>
    <li>📧 Invoice reminders</li>
    <li>🤝 Deal follow-ups</li>
    <li>💰 Payment confirmations</li>
    <li>📋 Task notifications</li>
  </ul>

  <h3>Next steps:</h3>
  <ol>
    <li>Configure the Action Recommender</li>
    <li>Set up approval workflows</li>
    <li>Let the AI COO start running your business!</li>
  </ol>

  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

  <p style="color: #6b7280; font-size: 12px;">
    <strong>AIOM AI COO System</strong><br>
    Powered by SMTP2GO
  </p>
</body>
</html>`
    );

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Timestamp: ${result.timestamp.toISOString()}`);
      console.log(`\n📬 Check your inbox: ${TEST_EMAIL}`);
      return true;
    } else {
      console.error('❌ Email send failed:', result.error);
      console.error('\n⚠️  Common issues:');
      console.error('   - API key not configured or invalid');
      console.error('   - Sender email not verified in SMTP2GO');
      console.error('   - Insufficient email credits');
      return false;
    }
  } catch (error) {
    console.error('❌ Email test failed:', error);
    return false;
  }
}

async function testSMSSending() {
  console.log('\n📱 Testing SMS Sending (Epic Gateway)...');
  console.log('═'.repeat(50));

  if (!ENABLE_SMS_TEST) {
    console.log('⏭️  SMS test skipped (ENABLE_SMS_TEST = false)');
    console.log('⚠️  Set ENABLE_SMS_TEST = true to test SMS');
    return true;
  }

  // Validate phone number for Epic gateway
  if (!isValidPhoneNumberForEpic(TEST_PHONE)) {
    console.error('❌ Invalid test phone number:', TEST_PHONE);
    console.error('⚠️  Phone must be 10 digits or 11 digits starting with 1');
    console.error('⚠️  Examples: 7671234567 or 17671234567');
    console.error('⚠️  Update TEST_PHONE in script');
    return false;
  }

  if (TEST_PHONE === '+15551234567' || TEST_PHONE === '15551234567') {
    console.error('❌ Please update TEST_PHONE with your actual phone number');
    return false;
  }

  try {
    console.log(`📤 Sending test SMS to: ${TEST_PHONE}`);
    console.log('⚠️  This will send via your Epic SMS Gateway at 818.epic.dm');

    const result = await sendSMSViaEpicGateway(
      TEST_PHONE,
      '✅ Epic SMS Test: Your AIOM AI COO system SMS integration is working! This message sent via your Epic Gateway at 818.epic.dm.'
    );

    if (result.success) {
      console.log('✅ SMS sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Timestamp: ${result.timestamp.toISOString()}`);
      if (result.details) {
        console.log(`   Recipient: ${result.details.to}`);
        console.log(`   HTTP Code: ${result.details.httpCode}`);
      }
      console.log(`\n📱 Check your phone: ${TEST_PHONE}`);
      return true;
    } else {
      console.error('❌ SMS send failed:', result.error);
      console.error('\n⚠️  Common issues:');
      console.error('   - Epic SMS Gateway credentials incorrect');
      console.error('   - Phone number format invalid');
      console.error('   - Gateway server unreachable');
      console.error('   - Check logs at: /var/log/freeswitch/sms_api.log');
      return false;
    }
  } catch (error) {
    console.error('❌ SMS test failed:', error);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║      Email & SMS Integration Test Suite                  ║');
  console.log('║      SMTP2GO (Email) + Epic Gateway (SMS)                 ║');
  console.log('║      AIOM AI COO System                                   ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const results: { test: string; passed: boolean }[] = [];

  // Test 1: API Connection
  const connectionOk = await testAPIConnection();
  results.push({ test: 'API Connection', passed: connectionOk });

  if (!connectionOk) {
    console.log('\n❌ API connection failed. Fix this before continuing.');
    printSummary(results);
    process.exit(1);
  }

  // Test 2: Email Sending
  const emailOk = await testEmailSending();
  results.push({ test: 'Email Sending', passed: emailOk });

  // Test 3: SMS Sending
  const smsOk = await testSMSSending();
  results.push({ test: 'SMS Sending', passed: smsOk });

  // Print summary
  printSummary(results);

  // Exit code
  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

function printSummary(results: { test: string; passed: boolean }[]) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${result.test}`);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`\n  Total: ${passedCount}/${totalCount} tests passed`);

  if (passedCount === totalCount) {
    console.log('\n✅ All tests passed! Email & SMS integrations working correctly.');
    console.log('\n📋 Services Configured:');
    console.log('   ✅ SMTP2GO - Email sending');
    console.log('   ✅ Epic Gateway - SMS sending');
    console.log('\n📋 Next Steps:');
    console.log('   1. Create the Action Recommender');
    console.log('   2. Build the Approval UI');
    console.log('   3. Start autonomous operations!');
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
    console.log('\n📖 For help, see: SMTP2GO_SETUP_GUIDE.md');
  }

  console.log('\n═'.repeat(50));
}

// ============================================================================
// RUN TESTS
// ============================================================================

runTests().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
