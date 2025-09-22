import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { template_name, template_type, business_id, automation_type } = req.body;

    if (!template_name || !business_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get business information for context
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name, business_type, description')
      .eq('id', business_id)
      .single();

    if (businessError) {
      console.error('Business fetch error:', businessError);
    }

    // Create context-aware prompt based on automation type
    const getPrompt = (templateName, templateType, businessInfo) => {
      const businessContext = businessInfo ? `for ${businessInfo.name} (${businessInfo.business_type || 'business'})` : 'for a business';
      
      const prompts = {
        'job_completed': `Create a professional follow-up email ${businessContext} after a job/service is completed. The message should:
        - Thank the customer for choosing the business
        - Express hope that they were satisfied with the service
        - Politely request a review
        - Include {{customer.name}} and {{review_link}} variables
        - Be warm but professional
        - Keep it concise (2-3 sentences)`,
        
        'invoice_paid': `Create a professional thank you email ${businessContext} after an invoice is paid. The message should:
        - Thank the customer for their payment
        - Express appreciation for their business
        - Politely request a review
        - Include {{customer.name}} and {{review_link}} variables
        - Be warm but professional
        - Keep it concise (2-3 sentences)`,
        
        'service_reminder': `Create a friendly reminder email ${businessContext} for an upcoming service appointment. The message should:
        - Be warm and friendly
        - Remind them of their upcoming appointment
        - Express excitement to serve them
        - Include {{customer.name}} and {{service_date}} variables
        - Be professional but personable
        - Keep it concise (2-3 sentences)`
      };

      return prompts[templateType] || prompts[templateName?.toLowerCase()] || 
        `Create a professional email message ${businessContext} for a ${templateName} automation. Include {{customer.name}} and {{review_link}} variables.`;
    };

    const prompt = getPrompt(template_name, template_type, business);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email copywriter specializing in customer follow-up messages. Create clear, concise, and professional messages that maintain a warm tone while being respectful of the customer\'s time.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error('OpenAI API request failed');
    }

    const aiData = await openaiResponse.json();
    const generatedMessage = aiData.choices[0]?.message?.content?.trim();

    if (!generatedMessage) {
      throw new Error('No message generated');
    }

    // Ensure variables are included if they weren't in the AI response
    let finalMessage = generatedMessage;
    if (!finalMessage.includes('{{customer.name}}')) {
      finalMessage = `{{customer.name}}, ${finalMessage}`;
    }
    if (!finalMessage.includes('{{review_link}}') && (template_type === 'job_completed' || template_type === 'invoice_paid')) {
      finalMessage += ' Please leave us a review at {{review_link}}.';
    }

    res.status(200).json({
      success: true,
      message: finalMessage,
      template_name,
      template_type
    });

  } catch (error) {
    console.error('AI generation error:', error);
    
    // Fallback to default message if AI fails
    const fallbackMessages = {
      'job_completed': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
      'invoice_paid': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
      'service_reminder': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!'
    };

    const fallbackMessage = fallbackMessages[template_type] || 
      'Thank you for your business! Please leave us a review at {{review_link}}.';

    res.status(200).json({
      success: true,
      message: fallbackMessage,
      template_name,
      template_type,
      fallback: true
    });
  }
}
