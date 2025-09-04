import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { review_id, tone = 'professional' } = req.body;

    if (!review_id) {
      return res.status(400).json({ error: 'Missing review_id' });
    }

    // Get user from JWT token
    const authHeader = headers().get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's business_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return res.status(400).json({ error: 'User not associated with a business' });
    }

    // Get review with business and customer context
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        businesses!inner(name, industry, city),
        customers!inner(full_name, email)
      `)
      .eq('id', review_id)
      .eq('business_id', profile.business_id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const business = review.businesses;
    const customer = review.customers;

    // Build context pack
    const contextPack = {
      review_text: review.review_text,
      rating: review.rating,
      customer_name: customer.full_name,
      business_name: business.name,
      business_industry: business.industry,
      business_city: business.city,
      review_date: review.created_at,
      job_type: review.job_type || 'service',
      staff_mentioned: review.staff_name || null
    };

    // Create AI prompt based on tone
    const toneInstructions = {
      professional: "Write in a professional, courteous tone. Be formal but warm.",
      friendly: "Write in a friendly, conversational tone. Be warm and personable.",
      grateful: "Write in a deeply grateful tone. Express sincere appreciation.",
      brief: "Write very concisely. Keep it short and to the point."
    };

    const prompt = `You are a customer service expert helping a ${business.industry} business respond to reviews.

BUSINESS CONTEXT:
- Business: ${business.name} (${business.industry} in ${business.city})
- Customer: ${customer.full_name}
- Rating: ${review.rating}/5 stars
- Review: "${review.review_text}"
- Job Type: ${contextPack.job_type}
${contextPack.staff_mentioned ? `- Staff Mentioned: ${contextPack.staff_mentioned}` : ''}

TONE: ${toneInstructions[tone] || toneInstructions.professional}

GUIDELINES:
- Be brief, grateful, and specific
- Reference specific details from their review
- Thank them by name
- Do NOT make promises or offer incentives
- Do NOT ask for anything in return
- Keep it under 100 words
- Match the energy of their review (if they're excited, be excited back)

Generate 2 different reply options. Return as JSON:
{
  "option1": "First reply option",
  "option2": "Second reply option",
  "tone": "${tone}",
  "word_count": [count1, count2]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert customer service representative who writes perfect review responses. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content);

      // Log telemetry event
      await supabase.rpc('log_telemetry_event', {
        p_business_id: profile.business_id,
        p_event_type: 'reply_coach_used',
        p_event_data: {
          review_id: review_id,
          tone: tone,
          rating: review.rating,
          context_pack: contextPack
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Reply suggestions generated successfully',
        suggestions: {
          option1: aiResponse.option1,
          option2: aiResponse.option2,
          tone: aiResponse.tone,
          word_count: aiResponse.word_count
        },
        context: contextPack,
        available_tones: Object.keys(toneInstructions)
      });

    } catch (aiError) {
      console.error('Error generating AI reply suggestions:', aiError);
      
      // Fallback to simple template
      const fallbackOption1 = `Thank you ${customer.full_name} for the ${review.rating}-star review! We're thrilled you had a great experience with ${business.name}. We appreciate your feedback and look forward to serving you again soon.`;
      
      const fallbackOption2 = `Hi ${customer.full_name}, thank you so much for taking the time to share your experience! We're delighted to hear about your positive experience with ${business.name}. Your feedback means the world to us.`;

      return res.status(200).json({
        success: true,
        message: 'Reply suggestions generated with fallback content',
        suggestions: {
          option1: fallbackOption1,
          option2: fallbackOption2,
          tone: 'professional',
          word_count: [fallbackOption1.split(' ').length, fallbackOption2.split(' ').length]
        },
        context: contextPack,
        available_tones: Object.keys(toneInstructions),
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error in reply-coach endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
