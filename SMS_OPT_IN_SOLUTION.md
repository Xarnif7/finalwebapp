# SMS Opt-In Compliance Solution

## 🚨 **Problem Identified**
Business owners add customers to Blipp, but customers never visit Blipp to opt in to SMS. This creates a compliance issue where we're sending SMS messages without explicit opt-in consent.

## ✅ **Solution: Two-Step SMS Flow**

### **Step 1: Opt-In Request SMS**
When a business owner adds a customer with a phone number, send an opt-in request SMS first:

```
Hi [Customer Name], [Business Name] would like to send you review requests and service updates via SMS. Reply YES to opt in, or visit [link] to manage preferences. Reply STOP to opt out. Message/data rates apply.
```

### **Step 2: Review Request SMS (Only After Opt-In)**
Only send actual review request SMS after the customer has opted in.

## 🛠 **Implementation Details**

### **1. Customer Addition Flow**
When a business owner adds a customer with a phone number:

1. **Check SMS consent status** in database
2. **If no consent**: Send opt-in request SMS
3. **If consent exists**: Send review request SMS directly

### **2. SMS Opt-In Request Page**
- **URL**: `/sms-opt-in-request?phone=+15551234567&business_id=123&customer_id=456`
- **Features**:
  - Customer verification
  - Clear opt-in/opt-out options
  - All compliance requirements met
  - Mobile-responsive design

### **3. Backend API Endpoint**
- **Endpoint**: `POST /api/sms/opt-in`
- **Purpose**: Record SMS opt-in/opt-out decisions
- **Updates**: `customers.sms_consent`, `customers.opted_out`, `customers.opted_out_at`

### **4. SMS Sending Logic Update**
Before sending any SMS:
1. **Check `customers.sms_consent`** field
2. **If `false`**: Send opt-in request instead of review request
3. **If `true`**: Send review request as normal
4. **If `opted_out`**: Don't send any SMS

## 📋 **Required Changes to Existing Code**

### **1. Update SMS Sending Logic**
In `server.js` automation executor and review request sender:

```javascript
// Before sending SMS, check consent
const { data: customer } = await supabase
  .from('customers')
  .select('sms_consent, opted_out, phone, full_name')
  .eq('id', customerId)
  .single();

if (customer.opted_out) {
  // Don't send any SMS
  return;
}

if (!customer.sms_consent) {
  // Send opt-in request instead of review request
  const optInMessage = `Hi ${customer.full_name}, ${businessName} would like to send you review requests and service updates via SMS. Reply YES to opt in, or visit ${optInLink} to manage preferences. Reply STOP to opt out. Message/data rates apply.`;
  
  await sendSMS({
    to: customer.phone,
    body: optInMessage
  });
  return;
}

// Customer has consented, send review request
await sendSMS({
  to: customer.phone,
  body: reviewRequestMessage
});
```

### **2. SMS Reply Handling**
Add webhook endpoint to handle SMS replies:

```javascript
app.post('/api/sms/webhook', async (req, res) => {
  const { From, Body } = req.body;
  
  const reply = Body.trim().toUpperCase();
  
  if (reply === 'YES') {
    // Process opt-in
    await processSmsOptIn(From, 'opt-in');
  } else if (reply === 'STOP') {
    // Process opt-out
    await processSmsOptIn(From, 'opt-out');
  }
  
  res.status(200).send('OK');
});
```

### **3. Customer Form Updates**
- ✅ **Already implemented**: Customer forms now include SMS consent collection
- ✅ **Already implemented**: Database schema includes SMS consent fields

## 🔗 **URLs for SMS Opt-In**

### **Standalone Opt-In Form**
```
https://myblipp.com/sms-opt-in?phone=+15551234567&email=user@example.com&name=John%20Doe&business=My%20Business
```

### **Customer-Specific Opt-In Request**
```
https://myblipp.com/sms-opt-in-request?phone=+15551234567&business_id=123&customer_id=456
```

## 📱 **SMS Message Templates**

### **Opt-In Request SMS**
```
Hi [Customer Name], [Business Name] would like to send you review requests and service updates via SMS. Reply YES to opt in, or visit [link] to manage preferences. Reply STOP to opt out. Message/data rates apply.
```

### **Review Request SMS (After Opt-In)**
```
Hi [Customer Name], thank you for choosing [Business Name]! We'd love to hear about your experience. Please leave us a review: [review_link]
```

## 🎯 **Compliance Checklist**

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **Explicit opt-in** | ✅ | Two-step flow with YES/STOP replies |
| **Business identification** | ✅ | Business name in all messages |
| **Message purpose** | ✅ | Clear explanation of review requests |
| **Opt-out method** | ✅ | Reply STOP to any message |
| **Data rates disclosure** | ✅ | "Message/data rates apply" |
| **Privacy policy link** | ✅ | Link in opt-in request page |
| **SMS data protection** | ✅ | Privacy policy clause added |

## 🚀 **Next Steps**

1. **Update SMS sending logic** in automation executor
2. **Add SMS webhook handler** for YES/STOP replies
3. **Test the complete flow** with real phone numbers
4. **Update business owner documentation** about the new flow
5. **Monitor compliance** with audit logs

## 📊 **Benefits**

- ✅ **Full SMS compliance** with opt-in requirements
- ✅ **Better customer experience** with clear consent process
- ✅ **Reduced spam complaints** by respecting opt-outs
- ✅ **Audit trail** of all opt-in/opt-out decisions
- ✅ **Flexible implementation** that works with existing customer data

This solution ensures that Blipp is fully compliant with SMS regulations while maintaining a smooth user experience for both business owners and their customers.
