# Journey Multi-Message Implementation Guide

## Overview
Implemented per-step message configuration for the Journey Builder, allowing users to create sophisticated multi-message campaigns with different purposes (thank you, follow-up, review request, rebooking, etc.).

## What Was Built

### 1. Message Templates Library (`MessageEditor.jsx`)
Created comprehensive template library with 7 message purposes:

**Template Purposes:**
- 🙏 **Thank You / Confirmation** - Post-purchase thank you messages
- 💬 **Post-Service Follow-up** - Check-in after service completion  
- ⭐ **Review Request** - Ask for customer reviews
- 📅 **Rebooking / Reschedule** - Prompt customers to rebook
- 💙 **Customer Retention** - Win-back campaigns with offers
- 🎯 **Upsell / Promotion** - Special offers and promotions
- ✏️ **Custom Message** - Blank template for custom content

**Each template includes:**
- Pre-written email subject lines and body text
- Pre-written SMS messages (under 160 characters)
- Purpose-specific variables (review_link, booking_link, etc.)
- Tone-optimized for each use case

### 2. Per-Step Message Editor Component
Created `PerStepMessageEditor` component that:
- ✅ Iterates through all communication steps in the flow (Email/SMS)
- ✅ Shows a message editor card for each step
- ✅ Includes message purpose dropdown
- ✅ "Load Template" button to auto-populate with pre-written content
- ✅ Separate fields for Email (subject + body) vs SMS (body only)
- ✅ Character counter for SMS (320 char limit)
- ✅ Dynamic variable suggestions based on message purpose
- ✅ Color-coded UI (Blue for Email, Green for SMS)

### 3. Helper Functions
```javascript
// Update message for specific step
updateFlowStepMessage(stepId, messageData)

// Load template for specific step
loadTemplateForStep(stepId, stepType, purposeKey)
```

## How It Works

### User Flow:
1. **Step 1:** User selects CRM trigger (QuickBooks, manual, etc.)
2. **Step 2:** User drags Email/SMS steps onto canvas
   ```
   Trigger → Email → SMS → Email
   ```
3. **Step 3 (NEW):** System shows 3 message editors (one per communication step):
   - **Email Step 1:** Purpose dropdown → Select "Thank You" → Load Template → Edit
   - **SMS Step 2:** Purpose dropdown → Select "Follow-up" → Load Template → Edit  
   - **Email Step 3:** Purpose dropdown → Select "Review Request" → Load Template → Edit
4. **Step 4:** Configure timing for each step
5. **Step 5:** Configure settings (quiet hours, stop if reviewed, etc.)
6. **Step 6:** Review and launch journey

### Data Structure:
```javascript
flowSteps = [
  {
    id: 1,
    type: 'trigger',
    // ...
  },
  {
    id: 2,
    type: 'email',
    message: {
      purpose: 'thank_you',
      subject: 'Thank you for choosing {{business.name}}!',
      body: 'Hi {{customer.name}}...'
    }
  },
  {
    id: 3,
    type: 'sms',
    message: {
      purpose: 'follow_up',
      body: 'Hi {{customer.name}}, just checking in!...'
    }
  },
  {
    id: 4,
    type: 'email',
    message: {
      purpose: 'review_request',
      subject: "We'd love your feedback!",
      body: 'Hi {{customer.name}}...'
    }
  }
]
```

## Integration Steps (To Complete)

### Step 1: Add Templates to AutomationWizard
```javascript
// In AutomationWizard.jsx
import PerStepMessageEditor, { MESSAGE_TEMPLATES } from './MessageEditor';

// Add helper functions
const updateFlowStepMessage = (stepId, messageData) => {
  setFlowSteps(prev => prev.map(step => 
    step.id === stepId 
      ? { ...step, message: { ...step.message, ...messageData } }
      : step
  ));
};

const loadTemplateForStep = (stepId, stepType, purposeKey) => {
  const template = MESSAGE_TEMPLATES[purposeKey];
  if (!template) return;
  
  const channelTemplate = stepType === 'email' ? template.email : template.sms;
  
  updateFlowStepMessage(stepId, {
    purpose: purposeKey,
    ...channelTemplate
  });
  
  toast({
    title: "Template Loaded",
    description: `${template.name} template applied`,
    variant: "default"
  });
};
```

### Step 2: Replace renderStep4 (Step 3) Content
```javascript
const renderStep4 = () => {
  const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-600" />
          Customize Messages
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          Configure each message in your journey. Choose a template or write custom content for each step.
        </p>
      </div>

      {/* Per-Step Message Editors */}
      <PerStepMessageEditor
        flowSteps={safeFlowSteps}
        updateFlowStepMessage={updateFlowStepMessage}
        loadTemplateForStep={loadTemplateForStep}
        toast={toast}
      />
    </div>
  );
};
```

### Step 3: Update handleCreate to Save Per-Step Messages
```javascript
const handleCreate = async () => {
  // ... existing validation ...
  
  const sequenceData = {
    name: formData.name,
    description: formData.description,
    // ... existing fields ...
    steps: flowSteps.map((step, index) => ({
      kind: step.type === 'send_email' ? 'send_email' : 
            step.type === 'send_sms' ? 'send_sms' : 
            step.type === 'wait' ? 'wait' : 'branch',
      step_index: index + 1,
      message_purpose: step.message?.purpose || 'custom',
      message_config: step.message ? {
        subject: step.message.subject,
        body: step.message.body,
        purpose: step.message.purpose
      } : null,
      // ... existing timing config ...
    }))
  };
  
  await createSequence(sequenceData);
};
```

## Database Schema (Already Exists!)
The `sequence_steps` table already has the fields we need:
```sql
ALTER TABLE sequence_steps 
ADD COLUMN IF NOT EXISTS message_purpose TEXT,
ADD COLUMN IF NOT EXISTS message_config JSONB DEFAULT '{}';
```

## Variables Supported
- `{{customer.name}}` - Customer's name
- `{{customer.email}}` - Customer's email
- `{{customer.phone}}` - Customer's phone
- `{{business.name}}` - Business name
- `{{business.phone}}` - Business phone
- `{{review_link}}` - Unique review link for customer
- `{{booking_link}}` - Booking/scheduling link
- `{{offer_link}}` - Custom offer/promotion link
- `{{service.type}}` - Type of service provided

## Benefits
1. ✅ **Flexible** - Each step can have different purpose/content
2. ✅ **Fast** - Pre-written templates save time
3. ✅ **Professional** - Templates are conversion-optimized
4. ✅ **Scalable** - Easy to add more templates
5. ✅ **User-friendly** - Clear purpose selection + load template button

## Example Journey: "Complete Customer Lifecycle"
```
Trigger: Invoice Paid (QuickBooks)
  ↓
Email: Thank You (immediate)
  "Thanks for payment! Here's your receipt..."
  ↓
Wait: 24 hours
  ↓
SMS: Post-Service Follow-up
  "How did everything go? Need anything?"
  ↓
Wait: 72 hours
  ↓
Email: Review Request
  "We'd love your feedback! Leave a review here..."
  ↓
Wait: 14 days
  ↓
SMS: Rebooking Prompt
  "Time to schedule your next service?"
```

Each message is purpose-specific, channel-appropriate, and easy to customize!

