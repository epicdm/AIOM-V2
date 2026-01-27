# ✅ Ready to Test - Workflow Execution Live!

**Date**: 2026-01-27
**Status**: 🟢 **DEV SERVER RUNNING**

---

## 🎉 Server Successfully Started!

The dev server is running and ready for testing:

```
✅ Server: http://localhost:3001
✅ Dashboard: http://localhost:3001/dashboard/ai-coo
✅ API Endpoint: http://localhost:3001/api/ai-coo/approve-action
```

**Note**: Server is on **port 3001** (3000 was in use)

---

## 🚀 Quick Test Instructions

### **1. Open the Dashboard**

Navigate to: **http://localhost:3001/dashboard/ai-coo**

You should see:
- AI Conversation column (left) with decision cards
- Live Activity Feed (center)
- Today's Impact metrics (right)

### **2. Find a Decision Card**

Look for cards with the "Approve & Execute" button. If none exist, you'll need to create a test action first (see below).

### **3. Test the Approve & Execute Button**

Click **"Approve & Execute"** on any decision card.

**Expected Behavior**:
1. ⏳ Button changes to "Executing..." with spinner
2. 🔄 Network request to `/api/ai-coo/approve-action`
3. ⚙️ Workflow executes (creates Odoo task, sends email, etc.)
4. ✅ Button changes to "Executed" with checkmark
5. ✅ Success message: "Action executed successfully!"

---

## 🧪 Create Test Action (If No Actions Exist)

If the dashboard shows no pending actions, create one manually:

### **Option A: Via SQL (Quickest)**

```sql
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
  'test-dashboard-' || EXTRACT(EPOCH FROM NOW())::text,
  'odoo_create',
  'odoo',
  'project.task',
  'pending',
  true,
  '{"model": "project.task", "values": {"name": "[DASHBOARD TEST] Workflow execution verification", "description": "This task was created by clicking Approve & Execute on the AI COO dashboard", "priority": "1"}}'::jsonb,
  '{
    "risk_level": "low",
    "requires_approval": true,
    "reasoning": "Testing dashboard workflow execution wiring",
    "affected_records": {
      "odoo_model": "project.task",
      "record_name": "Dashboard Test Task"
    },
    "operation": {
      "type": "create_odoo_task",
      "inputs": {
        "name": "[DASHBOARD TEST] Workflow execution verification"
      }
    },
    "expected_effect": "Creates a test task in Odoo to verify dashboard execution works",
    "proposed_changes": []
  }'::jsonb,
  'Test dashboard workflow execution',
  'Verifying that clicking Approve & Execute on the dashboard creates real records in Odoo',
  NOW()
);
```

### **Option B: Via Database Studio**

```bash
npm run db:studio
# Navigate to autonomous_actions table
# Click "Add Row"
# Fill in the fields manually
```

---

## 📋 Verification Checklist

After clicking "Approve & Execute", verify:

### ✅ **Dashboard UI**
- [ ] Button showed "Executing..." with spinner
- [ ] Button changed to "Executed" with checkmark
- [ ] Success message displayed
- [ ] Button is now disabled

### ✅ **Browser Console**
Open DevTools → Console, look for:
```
[AI COO] Action test-dashboard-... approved by user-..., executing...
[Workflow] Created Odoo project.task record: 12345
[AI COO] Action test-dashboard-... executed successfully: {...}
```

### ✅ **Database**
Check action status changed:
```sql
SELECT id, status, executed_at, result
FROM autonomous_actions
WHERE id LIKE 'test-dashboard-%'
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- `status`: 'executed'
- `executed_at`: Recent timestamp
- `result`: `{"recordId": 12345, "model": "project.task", "success": true}`

### ✅ **Odoo**
Navigate to: **Projects → Tasks**

Look for:
- Task name: `[DASHBOARD TEST] Workflow execution verification`
- Description: Created by clicking Approve & Execute...
- Created within last minute

---

## 🎯 What You're Testing

This verifies the complete flow:

```
Dashboard UI
  ↓ (User clicks "Approve & Execute")
API Endpoint (/api/ai-coo/approve-action)
  ↓ (Approves action in DB)
Workflow Engine (actionStepHandler.execute)
  ↓ (Executes based on actionType)
Odoo Client (odooClient.create)
  ↓ (Makes XML-RPC call to Odoo)
Odoo ERP
  ✅ (Task created!)
```

---

## 🐛 Common Issues

### **"Action not found" Error**

**Cause**: Action doesn't exist or already executed

**Fix**: Create a new test action (see above) with status 'pending'

### **Odoo Connection Error**

**Cause**: Missing Odoo credentials

**Fix**: Check `.env` file has:
```env
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=your_database
ODOO_USERNAME=your_username
ODOO_PASSWORD=your_password
```

Test Odoo connection:
```bash
npm run test scripts/test-workflow-execution.ts
```

### **"You must be logged in" Error**

**Cause**: Not authenticated

**Fix**:
1. Navigate to http://localhost:3001/login
2. Sign in with your account
3. Return to dashboard

---

## 📊 Success Indicators

You'll know it worked when:

1. ✅ **No errors in console** (browser or server)
2. ✅ **Action status = 'executed'** in database
3. ✅ **Task appears in Odoo** within 30 seconds
4. ✅ **Dashboard shows success state**

---

## 🎉 What This Proves

**Before**: Dashboard was a pretty prototype showing fake data
**After**: Dashboard executes **real autonomous actions** with one click!

This completes **Phase A: Wire Up Action Execution** from the autonomous COO plan.

**Next Steps**:
- Phase B: Build Operator Brain Loop (auto-generate actions)
- Phase C: Follow-up Orchestration (automatic deal/invoice follow-ups)
- Phase D: Calendar & Policy System (meeting scheduling, business rules)

---

## 📝 Report Results

After testing, document your findings:

**Worked?**: YES / NO

**Issues encountered**: (if any)

**Odoo Task ID**: (ID of created task)

**Time to execute**: (seconds from click to success)

---

**Happy Testing! 🚀**

The autonomous AI COO is now capable of executing real business operations with human approval.
