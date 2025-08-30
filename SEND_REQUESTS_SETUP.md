# Send Requests Functionality Setup

This document explains how to set up and use the new Send Requests functionality in the application.

## Features Implemented

### ✅ Email Functionality
- **Fully functional** email sending for review requests
- Uses base44 SendEmail integration with fallback service
- Template-based messaging with variable substitution
- Customer selection with email validation
- Message composition with template support

### 🚧 SMS Functionality  
- **UI implemented** but not yet functional
- SMS channel selection available in UI
- Character limit validation (160 chars)
- Placeholder for future SMS integration
- Clear indicators that SMS is "coming soon"

## Database Setup

Run the following SQL migration in your Supabase SQL editor:

```sql
-- See database-review-requests-migration.sql for the complete migration
```

This creates:
- `review_requests` table for tracking sent requests
- `templates` table for storing email/SMS templates
- Proper RLS policies and indexes

## How to Use

### 1. Navigate to Send Requests
- Go to the "Send Requests" tab in your dashboard
- You'll see two main sections: Templates and Send New Request

### 2. Configure Templates
- **Email Template**: Set your default email subject and body
- **SMS Template**: Set your default SMS message (160 char limit)
- Use variables: `{customer.name}`, `{review_link}`, `{company_name}`
- Templates are automatically saved to the database

### 3. Send a Review Request
1. Click "Send Review Request" button
2. **Select Customer**: Choose from your customer list
   - Customers with email addresses are highlighted
   - Customers without email/phone show appropriate warnings
3. **Choose Channel**: 
   - Email: Fully functional
   - SMS: UI available but not functional yet
   - Both: Will send email, SMS shows "coming soon" message
4. **Compose Message**:
   - Use "Use Template" to load your saved template
   - Edit the message as needed
   - Variables are automatically replaced when sending
5. **Send**: Click "Send Request" to deliver

### 4. View History
- All sent requests are tracked in the "Request History" section
- Filter by channel, status, or search by customer name
- See delivery status and timestamps

## Technical Details

### Email Service
- Primary: Uses base44 `SendEmail` integration
- Fallback: Custom email service for non-base44 environments
- Error handling with user-friendly messages

### Template Variables
- `{customer.name}`: Customer's full name
- `{review_link}`: Generated review link with customer reference
- `{company_name}`: Your business name from profile

### Database Schema
```sql
-- review_requests table
- business_id: Links to your business
- customer_id: Links to selected customer  
- channel: 'email', 'sms', or 'both'
- message: The actual message sent
- email_status/sms_status: Delivery status
- review_link: Generated review URL

-- templates table  
- business_id: Links to your business
- kind: 'email' or 'sms'
- subject: Email subject (email only)
- body: Message template
```

## SMS Integration (Future)

When SMS is ready to be implemented:

1. The UI is already in place
2. Update the `handleSendRequest` function to call SMS service
3. Remove the "coming soon" warnings
4. Implement SMS provider integration (Twilio, etc.)

## Troubleshooting

### Email Not Sending
- Check that customer has a valid email address
- Verify business email is configured in profile
- Check browser console for error messages
- Ensure base44 integration is properly configured

### Templates Not Saving
- Check database permissions
- Verify `templates` table exists
- Check browser console for errors

### Customer Selection Issues
- Ensure customers have been imported/created
- Check that customers have email addresses for email requests
- Verify business_id is properly set in user profile

## Security

- All database operations use Row Level Security (RLS)
- Users can only access their own business data
- Email addresses are validated before sending
- Templates are scoped to business_id
