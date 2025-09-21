import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if default sequences already exist for this user
    const { data: existingSequences, error: checkError } = await supabase
      .from('sequences')
      .select('id, name')
      .eq('user_id', user_id)
      .in('name', ['Job Completed', 'Invoice Paid', 'Service Reminder']);

    if (checkError) {
      console.error('Error checking existing sequences:', checkError);
      return res.status(500).json({ error: 'Failed to check existing sequences' });
    }

    // If all 3 default sequences already exist, return success
    if (existingSequences && existingSequences.length >= 3) {
      return res.status(200).json({ 
        message: 'Default sequences already exist',
        sequences: existingSequences
      });
    }

    // Create the 3 default sequences
    const defaultSequences = [
      {
        user_id,
        name: 'Job Completed',
        description: 'Send review requests when jobs are marked complete. Perfect for contractors and service providers.',
        status: 'draft', // Start as draft so user can review before enabling
        trigger_type: 'job_completed',
        channels: ['sms', 'email'],
        steps: [
          {
            step: 1,
            channel: 'sms',
            delay: 0,
            message: 'Hi {{customer_name}}, we just completed your {{job_type}} job! We\'d love to hear about your experience. Could you take a moment to leave us a review? {{review_link}}'
          },
          {
            step: 2,
            channel: 'email',
            delay: 24, // 24 hours later
            subject: 'How was your {{job_type}} service?',
            message: 'Hi {{customer_name}},\n\nWe hope you\'re happy with the {{job_type}} work we completed for you. Your feedback helps us improve and helps other customers find quality service providers.\n\nWould you mind taking a moment to leave us a review?\n\n{{review_link}}\n\nThank you for choosing us!\n\nBest regards,\n{{business_name}}'
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        user_id,
        name: 'Invoice Paid',
        description: 'Request reviews after payment is received. Great for B2B services and recurring clients.',
        status: 'draft',
        trigger_type: 'invoice_paid',
        channels: ['email', 'sms'],
        steps: [
          {
            step: 1,
            channel: 'email',
            delay: 0,
            subject: 'Thank you for your payment!',
            message: 'Hi {{customer_name}},\n\nThank you for your recent payment of ${{invoice_amount}} for {{service_type}}. We appreciate your business!\n\nWe\'d love to hear about your experience with our service. If you have a moment, would you consider leaving us a review?\n\n{{review_link}}\n\nThank you again for choosing us!\n\nBest regards,\n{{business_name}}'
          },
          {
            step: 2,
            channel: 'sms',
            delay: 48, // 48 hours later
            message: 'Hi {{customer_name}}, thanks for your payment! We\'d love a quick review if you have time: {{review_link}}'
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        user_id,
        name: 'Service Reminder',
        description: 'Follow up with customers after service appointments. Ideal for maintenance and recurring services.',
        status: 'draft',
        trigger_type: 'service_completed',
        channels: ['sms', 'email'],
        steps: [
          {
            step: 1,
            channel: 'sms',
            delay: 0,
            message: 'Hi {{customer_name}}, your {{service_type}} appointment is complete! How did everything go? We\'d love your feedback: {{review_link}}'
          },
          {
            step: 2,
            channel: 'email',
            delay: 72, // 72 hours later
            subject: 'How was your {{service_type}} service?',
            message: 'Hi {{customer_name}},\n\nWe hope you\'re satisfied with the {{service_type}} service we provided. Your feedback is valuable to us and helps other customers make informed decisions.\n\nCould you take a moment to share your experience?\n\n{{review_link}}\n\nThank you for your business!\n\nBest regards,\n{{business_name}}'
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Insert the sequences
    const { data: createdSequences, error: insertError } = await supabase
      .from('sequences')
      .insert(defaultSequences)
      .select();

    if (insertError) {
      console.error('Error creating default sequences:', insertError);
      return res.status(500).json({ error: 'Failed to create default sequences' });
    }

    console.log(`Created ${createdSequences.length} default sequences for user ${user_id}`);

    return res.status(200).json({ 
      message: 'Default sequences created successfully',
      sequences: createdSequences
    });

  } catch (error) {
    console.error('Error in create-defaults:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
