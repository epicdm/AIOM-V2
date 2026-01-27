# Testing Workflow Execution - Quick Start Guide

**Purpose**: Test that clicking "Approve & Execute" on the dashboard actually executes real actions in Odoo.

---

## 🚧 Current Blocker

**Database migration error** is preventing dev server from starting:
```
error: relation "community_post" already exists
```

**Quick Fix Options**:

### **Option 1: Skip Problematic Migration** (Recommended)
```bash
# Find the migration file creating community_post
cd drizzle
grep -r "community_post" *.sql

# Comment out the CREATE TABLE statement in that migration file
# OR delete the migration file if it's newer than what's in production
```

### **Option 2: Drop and Recreate Table**
```bash
# Connect to database
npm run db:studio

# Or use psql directly:
psql -U [username] -d [database_name]
DROP TABLE IF EXISTS community_post CASCADE;

# Then run migrations
npm run db:migrate
```

### **Option 3: Reset Drizzle Migrations Table**
```bash
# This will re-run all migrations (use with caution!)
psql -U [username] -d [database_name]
DROP TABLE IF EXISTS __drizzle_migrations;

npm run db:migrate
```

---

## ✅ Once Server Starts

### **1. Set Up Environment Variables**

Make sure these are configured in `.env`:

```env
# Odoo Configuration (for action execution)
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=your_database
ODOO_USERNAME=your_username
ODOO_PASSWORD=your_password

# Email Configuration (for email actions)
SMTP2GO_API_KEY=your_smtp2go_api_key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Database (should already be configured)
DATABASE_URL=postgresql://...
```

**Test Odoo Connection**:
```bash
npm run test scripts/test-workflow-execution.ts
```

This test script will:
- ✅ Create a task in Odoo
- ✅ Search for tasks in Odoo
- ✅ Send a test email

---

### **2. Create Test Action in Database**

**Option A: Use Existing Actions**

If you already have actions in the `autonomous_actions` table from AI COO analysis, just use those!

**Option B: Manually Insert Test Action**

```sql
-- Insert a test action
INSERT INTO autonomous_actions (
  id,
  action_type,
  target_system,
  target_id,
  status,
  requires_approval,
  parameters,
  action_protocol,
  description,
  decision_reasoning,
  created_at
) VALUES (
  'test-action-001',
  'odoo_create',
  'odoo',
  'project.task',
  'pending',
  true,
  '{"model": "project.task", "values": {"name": "[TEST] Dashboard workflow execution test", "description": "Created by AI COO dashboard test"}}'::jsonb,
  '{
    "risk_level": "low",
    "requires_approval": true,
    "reasoning": "Testing dashboard execution",
    "affected_records": {
      "odoo_model": "project.task",
      "record_name": "Test Task"
    },
    "operation": {
      "type": "create_odoo_task",
      "inputs": {
        "name": "[TEST] Dashboard workflow execution test"
      }
    },
    "expected_effect": "Creates a test task in Odoo"
  }'::jsonb,
  'Test action for dashboard workflow execution',
  'This is a test action to verify that the dashboard can execute real workflows',
  NOW()
);
```

---

### **3. Test Dashboard Interaction**

#### **Step 1: Navigate to Dashboard**
```
http://localhost:3000/dashboard/ai-coo
```

#### **Step 2: Find Your Test Action**

Look for a decision card with:
- Title: Related to the action you created
- Status: Should show as pending approval

#### **Step 3: Click "Approve & Execute"**

**Expected Behavior**:
1. Button changes to "Executing..." with spinner
2. Network request to `/api/ai-coo/approve-action`
3. Workflow executes (creates Odoo task)
4. Button changes to "Executed" with checkmark
5. Success message appears: "Action executed successfully!"

**Check Browser DevTools Console**:
```
[AI COO] Action test-action-001 approved by [userId], executing...
[Workflow] Created Odoo project.task record: 12345
[AI COO] Action test-action-001 executed successfully: {...}
```

#### **Step 4: Verify in Odoo**

Open Odoo and navigate to:
```
Projects → Tasks
```

Look for:
- Task name: `[TEST] Dashboard workflow execution test`
- Description: `Created by AI COO dashboard test`
- Should have been created within the last minute

#### **Step 5: Verify in Database**

```sql
-- Check action status changed
SELECT id, status, executed_at, result
FROM autonomous_actions
WHERE id = 'test-action-001';
```

**Expected Result**:
- `status`: 'executed'
- `executed_at`: Recent timestamp
- `result`: JSON with `{ recordId: 12345, model: "project.task", success: true }`

---

## 🧪 Test Different Action Types

### **Test Email Sending**

Create an email action:

```sql
INSERT INTO autonomous_actions (
  id, action_type, target_system, target_id, status, requires_approval,
  parameters, action_protocol, description, decision_reasoning, created_at
) VALUES (
  'test-email-001',
  'email_send',
  'smtp2go',
  'test-email',
  'pending',
  true,
  '{
    "to": "your-email@example.com",
    "subject": "[TEST] AI COO Email Test",
    "body": "This email was sent by the AI COO dashboard workflow execution test."
  }'::jsonb,
  '{
    "risk_level": "low",
    "requires_approval": true,
    "reasoning": "Testing email sending",
    "operation": { "type": "send_email" }
  }'::jsonb,
  'Test email action',
  'Testing email workflow execution',
  NOW()
);
```

**Approval & Execute** → Check your inbox!

---

### **Test Odoo Update**

Create an update action:

```sql
INSERT INTO autonomous_actions (
  id, action_type, target_system, target_id, status, requires_approval,
  parameters, action_protocol, description, decision_reasoning, created_at
) VALUES (
  'test-update-001',
  'odoo_update',
  'odoo',
  'crm.lead',
  'pending',
  true,
  '{
    "model": "crm.lead",
    "ids": [123],
    "values": {"stage_id": 4}
  }'::jsonb,
  '{
    "risk_level": "medium",
    "requires_approval": true,
    "reasoning": "Testing deal stage update",
    "operation": { "type": "update_odoo_record" }
  }'::jsonb,
  'Test deal update',
  'Testing Odoo update workflow',
  NOW()
);
```

**Note**: Replace `[123]` with an actual deal ID from your Odoo CRM!

---

## 🎯 Success Criteria

✅ **Dashboard UI**:
- Button shows loading state
- Button shows success state
- Success message displays

✅ **Backend Execution**:
- API endpoint receives request
- Workflow executes real operation
- Database updates action status

✅ **External Systems**:
- **Odoo**: Task/record created or updated
- **Email**: Message delivered to inbox
- **Audit**: Logged in `autonomous_actions` table

✅ **Error Handling**:
- Invalid action ID → Returns 404
- Missing Odoo config → Returns error
- Odoo API failure → Marks action as failed

---

## 🐛 Troubleshooting

### **"Action not found" Error**

- Check that action exists in database: `SELECT * FROM autonomous_actions WHERE id = 'your-action-id'`
- Verify status is 'pending' (not already executed)

### **"Cannot find module '~/data-access/odoo'" Error**

- Check that Odoo client file exists: `src/data-access/odoo.ts`
- Verify TypeScript paths are configured correctly in `tsconfig.json`

### **Odoo Connection Errors**

```bash
# Test Odoo connection directly
npm run test scripts/test-workflow-execution.ts
```

Check error messages:
- "Authentication failed" → Check ODOO_USERNAME, ODOO_PASSWORD
- "Database does not exist" → Check ODOO_DB
- "Cannot connect" → Check ODOO_URL, firewall, VPN

### **Email Not Sending**

- Check `SMTP2GO_API_KEY` is set
- Check `DEFAULT_FROM_EMAIL` is configured
- Check SMTP2GO dashboard for delivery logs
- Verify email address is valid

### **Database Query Errors**

```bash
# Check table exists
npm run db:studio
# Look for "autonomous_actions" table
```

If table doesn't exist:
```bash
npm run db:migrate
```

---

## 📊 Monitoring

### **View API Logs**

```bash
# Dev server console shows:
[AI COO] Action test-action-001 approved by user-123, executing...
[Workflow] Created Odoo project.task record: 12345
[AI COO] Action test-action-001 executed successfully
```

### **Query Action History**

```sql
-- Recent executed actions
SELECT
  id,
  action_type,
  status,
  executed_at,
  result->>'recordId' as created_record_id
FROM autonomous_actions
WHERE status = 'executed'
ORDER BY executed_at DESC
LIMIT 10;
```

### **Query Failed Actions**

```sql
-- Failed actions with error messages
SELECT
  id,
  action_type,
  status,
  result->>'error' as error_message,
  updated_at
FROM autonomous_actions
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

---

## 🚀 Next Steps After Testing

Once workflow execution is verified working:

1. **Create real action recommendations**:
   - Run AI COO financial analyzer
   - Generate action recommendations based on analysis

2. **Build Operator Brain Loop** (Phase B):
   - Automatically generate actions from analysis
   - Apply guardrails before execution
   - Auto-execute safe actions, request approval for risky ones

3. **Add more action types**:
   - SMS sending (Twilio)
   - Calendar scheduling (Google Calendar)
   - Custom scripts

4. **Improve dashboard**:
   - Real-time activity feed
   - Action history view
   - Audit log export

---

**Once the database migration is fixed, you're ready to test the fully functional autonomous dashboard!** 🎉
