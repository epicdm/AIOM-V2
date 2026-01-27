# SMTP2GO Integration Setup Guide

## Overview

AIOM now uses SMTP2GO for both email and SMS sending capabilities. SMTP2GO provides a unified API for both communication channels, making integration simple and reliable.

**Status**: ✅ Integration Complete

## What's Integrated

1. **Email Sending** - Send transactional emails for:
   - Invoice reminders
   - Deal follow-ups
   - Payment confirmations
   - Task notifications

2. **SMS Sending** - Send text messages for:
   - Urgent alerts
   - Approval requests
   - Quick notifications

## Setup Instructions

### Step 1: Get Your SMTP2GO API Key

1. **Login to SMTP2GO**: Go to [https://www.smtp2go.com](https://www.smtp2go.com) and login to your account

2. **Navigate to API Keys**:
   - Click on **Settings** in the top menu
   - Select **API Keys** from the sidebar
   - Or go directly to: [https://app.smtp2go.com/settings/apikeys/](https://app.smtp2go.com/settings/apikeys/)

3. **Create New API Key**:
   - Click **"Add API Key"** button
   - Name it: `AIOM Production` (or similar)
   - Select permissions:
     - ✅ **Send Email** (required)
     - ✅ **Send SMS** (required)
     - ✅ **View Statistics** (optional, for tracking)
   - Click **"Create API Key"**

4. **Copy the API Key**:
   - You'll see your new API key displayed once
   - **⚠️ IMPORTANT**: Copy it immediately - you won't see it again!
   - Format: `api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Configure Environment Variables

1. **Open `.env` file** in your project root

2. **Update SMTP2GO configuration**:
   ```env
   # SMTP2GO Configuration (Email & SMS)
   SMTP2GO_API_KEY="api-your-actual-api-key-here"
   SMTP2GO_SENDER_EMAIL="noreply@yourdomain.com"
   SMTP2GO_SMS_SENDER="AIOM"
   ```

3. **Variable Explanations**:
   - `SMTP2GO_API_KEY`: Your API key from Step 1 (required)
   - `SMTP2GO_SENDER_EMAIL`: Default email "from" address (update with your domain)
   - `SMTP2GO_SMS_SENDER`: SMS sender name (11 chars max) or verified phone number

### Step 3: Verify Sender Email

**Important**: SMTP2GO requires sender email verification for better deliverability.

1. **Add Sender in SMTP2GO**:
   - Go to [Settings > Sender Settings](https://app.smtp2go.com/settings/senders/)
   - Click **"Add Sender"**
   - Enter your sender email (e.g., `noreply@yourdomain.com`)
   - Click **"Send Verification Email"**

2. **Verify Email**:
   - Check your inbox for verification email from SMTP2GO
   - Click the verification link
   - Status will change to **"Verified"** ✅

3. **Optional: Domain Verification**:
   - For production, consider verifying your entire domain
   - Go to [Settings > Domains](https://app.smtp2go.com/settings/domains/)
   - Add your domain and follow DNS configuration instructions
   - This improves deliverability and removes "via smtp2go.com" from emails

### Step 4: SMS Setup (Optional but Recommended)

**Note**: SMS requires credits in your SMTP2GO account.

1. **Add SMS Credits**:
   - Go to [Billing > SMS Credits](https://app.smtp2go.com/billing/sms_credits/)
   - Purchase SMS credits (varies by country)
   - Typical pricing: $0.02-0.10 per SMS depending on destination

2. **Configure SMS Sender**:
   - **Option A: Use Alphanumeric Sender ID** (Recommended)
     - Set `SMTP2GO_SMS_SENDER="AIOM"` in .env
     - Shows as "AIOM" on recipient's phone
     - Max 11 characters, letters only
     - **⚠️ Not available in all countries** (works in most of Europe, Asia, not US)

   - **Option B: Use Your Phone Number**
     - Purchase a dedicated phone number from SMTP2GO
     - Go to [SMS > Phone Numbers](https://app.smtp2go.com/sms/numbers/)
     - Buy a number for your country
     - Set `SMTP2GO_SMS_SENDER="+15551234567"` (your number)
     - **Best for US/Canada**

### Step 5: Test the Integration

Run the test script to verify everything works:

```bash
npx tsx scripts/test-smtp2go-integration.ts
```

The test will:
- ✅ Verify API key is configured
- ✅ Send a test email to your address
- ✅ Send a test SMS to your phone (if configured)
- ✅ Show results and any errors

## API Documentation & Resources

### Official SMTP2GO Documentation
- **Main API Docs**: [https://apidoc.smtp2go.com/](https://apidoc.smtp2go.com/)
- **Send Email Guide**: [https://developers.smtp2go.com/docs/send-an-email](https://developers.smtp2go.com/docs/send-an-email)
- **Send SMS Guide**: [https://developers.smtp2go.com/reference/send-sms-1](https://developers.smtp2go.com/reference/send-sms-1)
- **Node.js Library**: [https://github.com/smtp2go-oss/nodejs](https://github.com/smtp2go-oss/nodejs)
- **SMS Overview**: [https://support.smtp2go.com/hc/en-gb/articles/6352101968409-SMS-Messaging-Overview](https://support.smtp2go.com/hc/en-gb/articles/6352101968409-SMS-Messaging-Overview)

### Getting Help
- **Support Portal**: [https://support.smtp2go.com](https://support.smtp2go.com)
- **Email Support**: support@smtp2go.com
- **Live Chat**: Available in dashboard

## Usage in Code

### Send Email
```typescript
import { sendEmailViaSMTP2GO } from '~/lib/ai-coo/safe-operations/smtp2go-client';

const result = await sendEmailViaSMTP2GO(
  'customer@example.com',
  'Invoice Reminder: INV-2024-001',
  'Your invoice is now 15 days overdue. Please remit payment...',
  '<p>Your invoice is now <strong>15 days overdue</strong>...</p>' // HTML optional
);

if (result.success) {
  console.log('Email sent! Message ID:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### Send SMS
```typescript
import { sendSMSViaSMTP2GO } from '~/lib/ai-coo/safe-operations/smtp2go-client';

const result = await sendSMSViaSMTP2GO(
  '+15551234567', // E.164 format required
  'Your invoice INV-2024-001 is overdue. Please contact us.'
);

if (result.success) {
  console.log('SMS sent! Message ID:', result.messageId);
} else {
  console.error('SMS failed:', result.error);
}
```

### Via Safe Operations Layer
```typescript
import { executeSafeOperation } from '~/lib/ai-coo/safe-operations';

// Email
const emailResult = await executeSafeOperation(
  {
    type: 'send_email',
    inputs: {
      to: 'customer@example.com',
      subject: 'Invoice Reminder',
      body_text: 'Your invoice is overdue...',
      body_html: '<p>Your invoice is <strong>overdue</strong>...</p>'
    }
  },
  'action-id-123',
  'org-id'
);

// SMS
const smsResult = await executeSafeOperation(
  {
    type: 'send_sms',
    inputs: {
      to: '+15551234567',
      body: 'Your invoice is overdue. Please contact us.'
    }
  },
  'action-id-456',
  'org-id'
);
```

## Rate Limits & Best Practices

### Email Rate Limits
- **Free Plan**: 1,000 emails/month
- **Paid Plans**: Varies by subscription (typically 10,000-1M+/month)
- **API Rate Limit**: 100 requests/minute
- **Recommended**: Batch emails when possible

### SMS Rate Limits
- **API Rate Limit**: 10 requests/second
- **Cost**: Pay-as-you-go, varies by country ($0.02-0.10 per message)
- **Message Length**:
  - 160 characters = 1 SMS credit
  - 320 characters = 2 SMS credits
  - And so on (160 chars per credit)

### Best Practices

1. **Email**:
   - Always include plain text version (`body_text`)
   - Use HTML for better formatting (`body_html`)
   - Keep subject lines under 50 characters
   - Include unsubscribe link for marketing emails
   - Verify sender domain for production

2. **SMS**:
   - Keep messages under 160 characters when possible
   - Use E.164 phone number format: `+[country][number]`
   - Include brand/company name in message
   - Respect opt-out requests
   - Don't send promotional SMS outside business hours

3. **Error Handling**:
   - Always check `result.success` before assuming sent
   - Log `result.error` for debugging
   - Implement retry logic for transient failures
   - Monitor delivery rates in SMTP2GO dashboard

4. **Security**:
   - Never commit API key to version control
   - Use environment variables only
   - Rotate API keys periodically
   - Use separate API keys for dev/staging/production

## Monitoring & Analytics

### SMTP2GO Dashboard
Access real-time analytics at [https://app.smtp2go.com/](https://app.smtp2go.com/):

- **Email Statistics**: Opens, clicks, bounces, spam reports
- **SMS Delivery**: Sent, delivered, failed
- **API Activity**: Request volume, errors, latency
- **Cost Tracking**: Email volume, SMS spend

### AIOM Tracking
The safe operations layer automatically:
- Logs all email/SMS sends with timestamps
- Records message IDs for tracking
- Stores results in action execution history
- Tracks outreach attempts in `outreach_state` table

## Troubleshooting

### Common Issues

**1. "SMTP2GO API key not configured"**
- **Solution**: Set `SMTP2GO_API_KEY` in `.env` file
- Verify the key starts with `api-`
- Check for typos or extra spaces

**2. "Sender email not verified"**
- **Solution**: Verify your sender email in SMTP2GO dashboard
- Go to [Settings > Sender Settings](https://app.smtp2go.com/settings/senders/)
- Resend verification email if needed

**3. "SMS send failed: Invalid destination"**
- **Solution**: Phone number must be in E.164 format
- Correct: `+15551234567`
- Wrong: `555-123-4567` or `(555) 123-4567`
- Use `formatPhoneNumber()` helper to convert

**4. "Insufficient SMS credits"**
- **Solution**: Purchase more SMS credits in SMTP2GO dashboard
- Go to [Billing > SMS Credits](https://app.smtp2go.com/billing/sms_credits/)

**5. Emails go to spam**
- **Solution**:
  - Verify your sending domain (DNS records)
  - Set up SPF, DKIM, DMARC records
  - Warm up your sender reputation gradually
  - Follow SMTP2GO's deliverability best practices

### Getting Detailed Logs

Check application logs for SMTP2GO activity:
```bash
# Filter for SMTP2GO logs
grep "\[SMTP2GO\]" logs/app.log

# Check last 50 email sends
grep "Email sent successfully" logs/app.log | tail -50

# Check failures
grep "Email send failed" logs/app.log | tail -20
```

### Testing Locally

Create a test script:
```typescript
// scripts/test-smtp2go.ts
import { sendEmailViaSMTP2GO, sendSMSViaSMTP2GO } from '../src/lib/ai-coo/safe-operations/smtp2go-client';

async function testSMTP2GO() {
  // Test email
  console.log('Testing email...');
  const emailResult = await sendEmailViaSMTP2GO(
    'your-email@example.com',
    'SMTP2GO Test Email',
    'This is a test email from AIOM AI COO system.',
    '<p>This is a <strong>test email</strong> from AIOM AI COO system.</p>'
  );

  console.log('Email result:', emailResult);

  // Test SMS (update with your phone number)
  console.log('\nTesting SMS...');
  const smsResult = await sendSMSViaSMTP2GO(
    '+15551234567', // Your phone number
    'SMTP2GO Test SMS from AIOM'
  );

  console.log('SMS result:', smsResult);
}

testSMTP2GO();
```

Run: `npx tsx scripts/test-smtp2go.ts`

## Security Considerations

### Production Checklist
- [ ] Use separate API key for production vs development
- [ ] Verify sender domain (not just email)
- [ ] Set up SPF/DKIM/DMARC records
- [ ] Enable two-factor authentication on SMTP2GO account
- [ ] Monitor API usage for unusual activity
- [ ] Implement rate limiting in application code
- [ ] Log all communications for audit trail
- [ ] Rotate API keys every 90 days
- [ ] Use HTTPS only for API requests (enforced by SMTP2GO)
- [ ] Never log full email/SMS content (PII concerns)

### Data Privacy
- SMTP2GO stores email content for 30 days for troubleshooting
- SMS messages are stored for 90 days
- Recipient data is retained according to SMTP2GO's privacy policy
- For GDPR compliance, configure data retention settings in dashboard

## Cost Estimation

### Typical Monthly Costs

**Email-Only Usage**:
- Free tier: 1,000 emails/month = $0
- Starter: 10,000 emails/month = $10
- Growth: 50,000 emails/month = $30
- Business: 250,000 emails/month = $100

**SMS Usage** (Pay-as-you-go):
- US/Canada: ~$0.02-0.04 per SMS
- Europe: ~$0.04-0.10 per SMS
- Asia: ~$0.02-0.08 per SMS
- Example: 1,000 SMS/month to US = ~$30

**AIOM Estimated Usage** (conservative):
- Invoice reminders: ~100 emails/month
- Deal follow-ups: ~50 emails/month
- Task notifications: ~200 emails/month
- Urgent alerts (SMS): ~20 SMS/month
- **Total**: ~350 emails + 20 SMS = ~$1-5/month on Starter plan

**Note**: Adjust based on your customer volume and automation level.

## Next Steps

1. ✅ Get SMTP2GO API key
2. ✅ Update `.env` with credentials
3. ✅ Verify sender email
4. ✅ Run test script
5. ⏳ Configure Action Recommender to generate email/SMS actions
6. ⏳ Build Approval UI to see actions before they execute
7. ⏳ Deploy and monitor first automated emails

## Support

**Questions?**
- Check the [SMTP2GO Support Portal](https://support.smtp2go.com)
- Email their support: support@smtp2go.com
- For AIOM integration issues, check `ACTION_PROTOCOL_V1_1_INTEGRATION.md`

**Integration Complete!** 🎉

Your AI COO can now send real emails and SMS messages autonomously.
