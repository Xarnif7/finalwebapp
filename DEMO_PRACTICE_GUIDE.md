# 🚀 Blipp MVP Demo Practice Guide

## **Pre-Demo Checklist**

### **1. Database Setup** ✅
- [ ] Run `create-sequences-table.sql` in Supabase SQL Editor
- [ ] Verify `sequences` and `sequence_steps` tables exist
- [ ] Check RLS policies are active

### **2. Environment Configuration** ✅
- [ ] Verify Resend API key is configured (`RESEND_API_KEY`)
- [ ] Verify Twilio credentials are configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)
- [ ] Verify Supabase connection is working
- [ ] Check all environment variables in `.env`

### **3. Server Status** ✅
- [ ] Start development server: `npm run dev`
- [ ] Verify server is running on `http://localhost:5173`
- [ ] Check API endpoints are accessible

---

## **🎯 Demo Flow Practice**

### **Phase 1: Journey Creation (5 minutes)**

1. **Navigate to Automations Tab**
   - Go to `http://localhost:5173/automations`
   - Verify you see the "Create Journey" button
   - Check that Active Sequences tab is empty initially

2. **Create a New Journey**
   - Click "Create Journey"
   - **Step 1: Journey Basics**
     - Name: "Demo Review Request"
     - Description: "Automated follow-up after service completion"
   - **Step 2: Build Flow**
     - Add Email step
     - Add SMS step (with 1 hour delay)
   - **Step 3: Messages**
     - Email Subject: "Thank you for your service, {{CUSTOMER_NAME}}!"
     - Email Body: "Hi {{CUSTOMER_NAME}}, thank you for choosing us! Please leave us a review: {{REVIEW_LINK}}"
     - SMS Body: "Hi {{CUSTOMER_NAME}}, how was your service? Please leave us a review: {{REVIEW_LINK}}"
   - **Step 4: Timing**
     - Email: Send immediately (0 hours)
     - SMS: Send after 1 hour
   - **Step 5: Settings**
     - Quiet Hours: 10 PM - 8 AM
     - Rate Limits: 100/hour, 1000/day
   - **Step 6: Review & Create**
     - Click "Create & Activate"

3. **Verify Journey Creation**
   - Journey should appear in Active Sequences tab
   - Status should be "Active" with green badge
   - Toggle switch should be green (active)

### **Phase 2: Toggle Functionality (2 minutes)**

1. **Test Toggle Switch**
   - Click the toggle switch on the created journey
   - Status should change to "Paused" with yellow badge
   - Toggle switch should turn yellow
   - Click again to reactivate

2. **Verify Visual Feedback**
   - Check toast notifications appear
   - Verify status changes are immediate
   - Confirm toggle colors (green = active, yellow = paused)

### **Phase 3: CRM Integration Demo (3 minutes)**

1. **Show QBO Integration**
   - Navigate to Settings → Integrations
   - Show QuickBooks Online connection
   - Explain webhook setup for invoice payments

2. **Show Jobber Integration**
   - Show Jobber connection
   - Explain webhook setup for job completion

3. **Demonstrate Trigger Flow**
   - Explain: "When a job is completed in Jobber, it sends a webhook to Blipp"
   - "Blipp matches the event to our 'Demo Review Request' journey"
   - "The system automatically enrolls the customer and starts the sequence"

### **Phase 4: Message Delivery Demo (5 minutes)**

1. **Test Email Sending**
   - Use the "Test Send" button on the journey
   - Send test email to your own email address
   - Verify email arrives with correct content and variables

2. **Test SMS Sending**
   - Use the "Test Send" button for SMS
   - Send test SMS to your phone number
   - Verify SMS arrives with correct content

3. **Show Message Templates**
   - Demonstrate variable substitution: `{{CUSTOMER_NAME}}`, `{{REVIEW_LINK}}`
   - Show how messages are personalized for each customer

### **Phase 5: Analytics & Monitoring (2 minutes)**

1. **Show Automation Logs**
   - Navigate to automation logs
   - Show sent messages, delivery status, open rates

2. **Show Performance Metrics**
   - Display automation KPIs
   - Show conversion rates and engagement metrics

---

## **🔧 Technical Verification**

### **API Endpoints to Test**
```bash
# Test sequences API
curl -X GET http://localhost:3000/api/sequences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test sequence creation
curl -X POST http://localhost:3000/api/sequences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test","status":"active","steps":[]}'

# Test automation trigger
curl -X POST http://localhost:3000/api/automation/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"business_id":"test","customer_id":"test","trigger_type":"invoice_paid"}'
```

### **Database Verification**
```sql
-- Check sequences table
SELECT * FROM sequences WHERE business_id = 'your-business-id';

-- Check sequence steps
SELECT * FROM sequence_steps WHERE sequence_id = 'your-sequence-id';

-- Check automation logs
SELECT * FROM automation_logs WHERE business_id = 'your-business-id';
```

---

## **🎭 Demo Script**

### **Opening (30 seconds)**
"Today I'll show you Blipp, our review automation platform that helps service businesses automatically request reviews from customers after completing jobs or receiving payments."

### **Journey Creation (2 minutes)**
"Let me create a new automation journey. I'll set up a sequence that sends an email immediately after a job is completed, followed by an SMS reminder one hour later."

### **Toggle Demo (1 minute)**
"Notice this toggle switch - I can pause or activate any journey instantly. When paused, no new customers will be enrolled, but existing customers will continue through their sequence."

### **Integration Demo (2 minutes)**
"Blipp integrates with your existing tools. When a job is completed in Jobber or an invoice is paid in QuickBooks, it automatically triggers our review request sequence."

### **Message Demo (2 minutes)**
"Let me send a test message to show you how it works. The system personalizes each message with the customer's name and includes a direct link to leave a review."

### **Analytics Demo (1 minute)**
"Here you can see the performance of your automations - delivery rates, open rates, and conversion to reviews."

### **Closing (30 seconds)**
"Blipp automates your review requests, saving you time while increasing your review volume. The system is ready to go live and start working for your business."

---

## **🚨 Troubleshooting**

### **Common Issues & Solutions**

1. **Journey doesn't appear after creation**
   - Check browser console for errors
   - Verify sequences table exists in database
   - Refresh the page

2. **Toggle switch doesn't work**
   - Check network tab for API errors
   - Verify toggle endpoint is working
   - Check authentication token

3. **Test messages don't send**
   - Verify Resend/Twilio credentials
   - Check API endpoint responses
   - Verify email/phone format

4. **Database errors**
   - Run the sequences table creation SQL
   - Check RLS policies
   - Verify business ID exists

### **Emergency Fixes**
- If server crashes: `npm run dev`
- If database issues: Run `create-sequences-table.sql`
- If API errors: Check environment variables
- If UI issues: Hard refresh browser (Ctrl+F5)

---

## **✅ Final Checklist**

- [ ] All journeys can be created successfully
- [ ] Toggle switches work (green/yellow colors)
- [ ] Test emails send and arrive
- [ ] Test SMS messages send and arrive
- [ ] CRM integrations are connected
- [ ] Analytics show data
- [ ] No console errors
- [ ] All API endpoints respond correctly
- [ ] Database tables exist and have data
- [ ] Environment variables are configured

**🎯 Ready for Demo!** 🚀
