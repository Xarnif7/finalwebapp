# Blipp Zapier Integration Guide

## Quick Setup (2-Click Demo)

### 1. Zapier Template URLs

**Job Completed → Review Request**
- Template: `https://zapier.com/app/editor/123456789/step-1`
- Description: Triggers when a job is marked complete in your CRM
- Chain: `CRM Trigger → Blipp: Upsert Customer → Blipp: Trigger Event`

**Invoice Paid → Review Request**  
- Template: `https://zapier.com/app/editor/123456790/step-1`
- Description: Triggers when an invoice payment is received
- Chain: `Payment System → Blipp: Upsert Customer → Blipp: Trigger Event`

**Service Scheduled → Review Request**
- Template: `https://zapier.com/app/editor/123456791/step-1`
- Description: Triggers when a service appointment is scheduled
- Chain: `Scheduling App → Blipp: Upsert Customer → Blipp: Trigger Event`

### 2. Field Mapping

**Required Fields:**
- `email` OR `phone` (at least one required)
- `first_name` (recommended)
- `last_name` (recommended)
- `external_id` (your CRM's customer ID)

**Optional Fields:**
- `tags[]` (array of strings)
- `source` (e.g., "zapier", "crm", "website")
- `event_ts` (ISO timestamp, defaults to now)

### 3. API Endpoints & Auth

**Base URL:** `https://myblipp.com/api`

**Authentication Headers:**
```
X-Zapier-Token: your_zapier_token_here
Content-Type: application/json
```

**Endpoint 1: Upsert Customer**
```
POST /zapier/upsert-customer
```

**Payload Example:**
```json
{
  "email": "customer@example.com",
  "phone": "+1234567890",
  "first_name": "John",
  "last_name": "Doe", 
  "external_id": "crm_12345",
  "tags": ["vip", "repeat-customer"],
  "source": "zapier",
  "event_ts": "2025-01-18T10:30:00Z"
}
```

**Response:**
```json
{
  "ok": true,
  "customer_id": "cust_1737207000000",
  "message": "Customer upserted successfully"
}
```

**Endpoint 2: Trigger Event**
```
POST /zapier/event
```

**Payload Example:**
```json
{
  "event_type": "job_completed",
  "email": "customer@example.com",
  "external_id": "crm_12345",
  "service_date": "2025-01-18",
  "payload": {
    "job_id": "job_789",
    "service_type": "plumbing",
    "amount": 150.00
  }
}
```

**Response:**
```json
{
  "ok": true,
  "enrollment_id": "enroll_1737207000000",
  "message": "Event processed, sequence enrollment created"
}
```

### 4. Onboarding Checklist

**Pre-Setup (Admin):**
- [ ] Generate Zapier token in Blipp dashboard
- [ ] Create test business account
- [ ] Set up at least one automation sequence
- [ ] Configure quiet hours and rate limits

**Demo Setup (5 minutes):**
- [ ] Open Zapier template URL
- [ ] Connect your CRM/payment system
- [ ] Map required fields (email/phone + external_id)
- [ ] Add Blipp token to authentication
- [ ] Test with sample data
- [ ] Enable the Zap
- [ ] Verify customer appears in Blipp dashboard
- [ ] Check automation sequence is triggered

**Verification Steps:**
- [ ] Customer shows in Blipp Customers tab
- [ ] Automation sequence shows "Active" status
- [ ] Test event creates enrollment
- [ ] Messages are queued/sent (check Logs tab)
- [ ] No errors in Zapier history

### 5. Troubleshooting

**Common Issues:**
- **401 Unauthorized:** Check X-Zapier-Token header
- **400 Bad Request:** Verify required fields (email OR phone)
- **Customer not appearing:** Check business_id mapping
- **Sequence not triggering:** Verify event_type matches sequence trigger

**Debug Endpoints:**
- `GET /api/zapier/ping` - Test authentication
- `GET /api/automation-logs` - Check event processing
- `GET /api/sequences` - Verify active sequences

### 6. Production Checklist

- [ ] Use production Zapier token
- [ ] Set up monitoring alerts
- [ ] Configure rate limits appropriately
- [ ] Test with real data volume
- [ ] Set up error notifications
- [ ] Document custom field mappings
- [ ] Train team on troubleshooting

---

**Need Help?** Contact: dev@myblipp.com
**Last Updated:** January 18, 2025
