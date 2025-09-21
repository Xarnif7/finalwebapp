# Google Sheets → Blipp Automation Template

## Overview
This template allows businesses to add customers to a Google Sheet and automatically trigger Blipp automation sequences.

## Setup Instructions

### 1. Create Google Sheet
Create a Google Sheet with these columns:
- `full_name` (Column A) - Customer's full name
- `email` (Column B) - Customer's email address
- `phone` (Column C) - Customer's phone number (optional)
- `event_type` (Column D) - Type of event (e.g., "invoice_paid", "job_completed")

### 2. Zapier Configuration

**Trigger:** Google Sheets - New Spreadsheet Row

**Action:** Webhooks by Zapier - POST

**Webhook URL:** `https://myblipp.com/api/zapier/automation-webhook`

**Headers:**
```
Content-Type: application/json
X-Zapier-Token: [Your Zapier Token]
X-Blipp-Business: [Your Business ID]
```

**Payload:**
```json
{
  "customer_data": {
    "full_name": "{{A}}",
    "email": "{{B}}",
    "phone": "{{C}}",
    "external_id": "{{row_number}}"
  },
  "event_type": "{{D}}",
  "business_id": "[Your Business ID]"
}
```

### 3. Test the Integration

1. Add a test row to your Google Sheet
2. Check that the customer appears in your Blipp dashboard
3. Verify that automation sequences are triggered
4. Confirm emails are sent via Resend

## Event Types

Use these event types in column D to trigger different automations:

- `invoice_paid` - Triggers invoice payment automation
- `job_completed` - Triggers job completion automation  
- `customer_created` - Triggers new customer automation

## Troubleshooting

- Check Zapier logs for webhook delivery status
- Verify business_id matches your Blipp business
- Ensure automation sequences are active in Blipp dashboard
- Check Resend API key is configured correctly
