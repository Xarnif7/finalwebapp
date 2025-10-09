# 🚀 DEPLOYMENT CHECKLIST - Multi-Message Journeys + QBO Token Fix

## ✅ PRE-DEPLOYMENT VERIFICATION

All changes are ready for production deployment!

---

## 📋 **DEPLOYMENT STEPS**

### **1. Database Migration** ⏱️ 2 minutes

Run in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20251009_journey_per_step_messages.sql

ALTER TABLE sequence_steps 
ADD COLUMN IF NOT EXISTS message_purpose TEXT,
ADD COLUMN IF NOT EXISTS message_config JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_sequence_steps_message_purpose 
ON sequence_steps(message_purpose);

UPDATE sequence_steps 
SET message_purpose = 'custom',
    message_config = CASE 
      WHEN kind = 'send_email' THEN jsonb_build_object(
        'purpose', 'custom',
        'subject', 'Message from your service provider',
        'body', 'Thank you for your business!'
      )
      WHEN kind = 'send_sms' THEN jsonb_build_object(
        'purpose', 'custom',
        'body', 'Thank you for your business!'
      )
      ELSE '{}'::jsonb
    END
WHERE message_purpose IS NULL AND kind IN ('send_email', 'send_sms');
```

**Verification:**
```sql
-- Should return message_purpose and message_config columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sequence_steps' 
AND column_name IN ('message_purpose', 'message_config');
```

---

### **2. Deploy Code to Vercel** ⏱️ 5 minutes

```bash
# Commit changes
git add .
git commit -m "feat: Multi-message journeys + QBO token auto-refresh"

# Push to production
git push origin main
```

**Vercel will auto-deploy with:**
- ✅ Updated AutomationWizard.jsx (per-step message editors)
- ✅ New MessageEditor.jsx component
- ✅ Updated server.js (sequence creation, enrollment, executor)
- ✅ Updated vercel.json (hourly QBO token refresh)

---

### **3. Verify Deployment** ⏱️ 3 minutes

#### **Check 1: Multi-Message Journeys Work**
```
1. Go to https://app.myblipp.com/automations
2. Click "Create Journey"
3. Step 1: Select trigger (QuickBooks → Invoice Paid)
4. Step 2: Drag Email → SMS → Email
5. Step 3: ✅ VERIFY: See 3 separate message editors
6. Each editor should have:
   - Message purpose dropdown
   - "Load Template" button
   - Subject/Body fields
7. Select purpose → Click "Load Template" → Should auto-fill
8. Save journey
9. Check database: Sequence and steps should exist
```

#### **Check 2: QBO Token Refresh Works**
```
1. Go to Settings → Integrations
2. Verify QuickBooks shows "Connected"
3. Check logs for:
   "[CRON] Starting QBO token refresh job..."
   "[QBO] Token refreshed successfully..."
4. Wait 1 hour
5. Trigger a test invoice event
6. Check logs for:
   "[QBO] Token needs refresh, refreshing before API call..."
   "✅ [QBO] Token refreshed successfully"
7. Journey should trigger successfully
```

---

## 🧪 **POST-DEPLOYMENT TESTS**

### **Test 1: Create Multi-Message Journey**
```
Expected Flow:
1. Create journey with 3 steps (Email → SMS → Email)
2. Configure different messages per step
3. Save successfully
4. Check database:
   SELECT * FROM sequences WHERE name = 'Your Journey';
   SELECT * FROM sequence_steps WHERE sequence_id = '[ID]';
5. Verify message_config column has your messages
```

### **Test 2: Journey Execution**
```
Expected Flow:
1. Create test journey with immediate send
2. Manually enroll test customer
3. Wait 1 minute for cron
4. Check logs for "[JOURNEY] Sent EMAIL to..."
5. Verify customer received email
6. Check sequence_enrollments:
   - current_step_index should advance
   - next_run_at should be set for next step
```

### **Test 3: QBO Token Persistence**
```
Expected Flow:
1. Connect QuickBooks
2. Wait 2 hours (don't close browser)
3. Trigger invoice event (via QBO or test)
4. Journey should work WITHOUT reconnecting
5. Check integrations_quickbooks table:
   - token_expires_at should be updated
   - access_token should be different (refreshed)
```

---

## ⚠️ **POTENTIAL ISSUES & FIXES**

### **Issue 1: message_config columns don't exist**
**Fix:** Run migration in Step 1 above

### **Issue 2: QBO still requires reconnection**
**Troubleshoot:**
```sql
-- Check token expiry times
SELECT 
  business_id,
  token_expires_at,
  NOW() as current_time,
  token_expires_at - NOW() as time_remaining
FROM integrations_quickbooks;

-- If time_remaining is negative → Token expired
-- Check cron logs for refresh attempts
```

### **Issue 3: Journeys don't trigger**
**Troubleshoot:**
```sql
-- Verify sequences exist
SELECT id, name, trigger_event_type, status 
FROM sequences 
WHERE status = 'active';

-- Verify enrollments created
SELECT * FROM sequence_enrollments 
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 **SUCCESS METRICS**

After deployment, monitor for 24 hours:

| Metric | Expected | How to Check |
|--------|----------|--------------|
| **QBO Token Refreshes** | Every hour | Check cron logs |
| **Journey Enrollments** | Increases on triggers | `SELECT COUNT(*) FROM sequence_enrollments` |
| **Messages Sent** | Increases over time | Check executor logs |
| **QBO Reconnections** | ZERO | User feedback |
| **Token Expiry Errors** | ZERO | Search logs for "401" or "expired" |

---

## ✅ **ROLLBACK PLAN (if needed)**

If something breaks:

```bash
# Revert to previous version
git revert HEAD
git push origin main
```

**Or manually:**
1. Change vercel.json cron back to daily: `"schedule": "0 2 * * *"`
2. Revert needsTokenRefresh threshold to 7 days
3. Redeploy

**But this shouldn't be needed - changes are non-breaking!**

---

## 🎉 **READY TO DEPLOY!**

All code changes:
- ✅ Tested locally
- ✅ Zero linter errors
- ✅ Schema verified
- ✅ Non-breaking changes
- ✅ Backwards compatible

**Deploy now and say goodbye to QuickBooks reconnection issues!** 🚀

