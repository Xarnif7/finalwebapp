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
    const { current_message, template_name, template_type, business_id } = req.body;

    if (!current_message || !business_id) {
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

    // Create enhancement prompt
    const getEnhancementPrompt = (currentMessage, templateName, templateType, businessInfo) => {
      const businessContext = businessInfo ? `for ${businessInfo.name} (${businessInfo.business_type || 'business'})` : 'for a business';
      
      const contextPrompts = {
        'job_completed': `This is a follow-up message ${businessContext} after a job/service is completed.`,
        'invoice_paid': `This is a thank you message ${businessContext} after an invoice is paid.`,
        'service_reminder': `This is a reminder message ${businessContext} for an upcoming service appointment.`
      };

      const context = contextPrompts[templateType] || `This is a ${templateName} message ${businessContext}.`;

      return `Please enhance the following message to make it more professional, engaging, and effective while maintaining the same meaning and tone. ${context}

Current message: "${current_message}"

Guidelines for enhancement:
- Keep the same core message and meaning
- Make it more professional and polished
- Ensure it sounds natural and conversational
- Maintain appropriate tone for the context
- Keep variables like {{customer.name}} and {{review_link}} intact
- Make it more engaging without being pushy
- Keep it concise (2-3 sentences)

Enhanced message:`;
    };

    const prompt = getEnhancementPrompt(current_message, template_name, template_type, business);

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
            content: 'You are a professional email copywriter. Enhance messages to be more professional, engaging, and effective while maintaining the original meaning and tone. Always preserve variable placeholders like {{customer.name}} and {{review_link}} exactly as they are.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.5, // Lower temperature for more consistent enhancements
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error('OpenAI API request failed');
    }

    const aiData = await openaiResponse.json();
    const enhancedMessage = aiData.choices[0]?.message?.content?.trim();

    if (!enhancedMessage) {
      throw new Error('No enhanced message generated');
    }

    // Ensure variables are preserved
    let finalMessage = enhancedMessage;
    
    // Preserve original variables if they were in the original message
    if (current_message.includes('{{customer.name}}') && !finalMessage.includes('{{customer.name}}')) {
      finalMessage = finalMessage.replace(/^(.*?)([A-Z])/, '{{customer.name}}, $2');
    }
    if (current_message.includes('{{review_link}}') && !finalMessage.includes('{{review_link}}')) {
      finalMessage += ' Please leave us a review at {{review_link}}.';
    }

    res.status(200).json({
      success: true,
      enhanced_message: finalMessage,
      original_message: current_message,
      template_name,
      template_type
    });

  } catch (error) {
    console.error('AI enhancement error:', error);
    
    // Return original message if enhancement fails
    res.status(200).json({
      success: true,
      enhanced_message: current_message,
      original_message: current_message,
      template_name,
      template_type,
      fallback: true
    });
  }
}
