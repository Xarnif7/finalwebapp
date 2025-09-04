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
    const { review_id } = req.body;

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

    // Get review with business info
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        businesses!inner(name, industry, city)
      `)
      .eq('id', review_id)
      .eq('business_id', profile.business_id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const business = review.businesses;

    // Generate social media caption using OpenAI
    const prompt = `Create a social media post for a ${business.industry} business called "${business.name}" in ${business.city}. 

The review is ${review.rating} stars with the text: "${review.review_text}"

Create a brief, engaging caption that:
- Thanks the customer (use first name only if available: ${review.customer_name || 'Customer'})
- Highlights the positive aspects mentioned
- Is professional but friendly
- Includes relevant hashtags
- Is under 200 characters
- Does NOT include the full review text (just reference it)

Format as JSON with: {"caption": "text", "hashtags": ["tag1", "tag2"]}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a social media expert creating engaging posts for local businesses. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content);
      
      // Generate image URL (placeholder for now - in production, use DALL-E or similar)
      const imageUrl = `${process.env.APP_BASE_URL}/api/social/generate-image?review_id=${review_id}`;

      // Create social post record
      const { data: socialPost, error: insertError } = await supabase
        .from('social_posts')
        .insert({
          business_id: profile.business_id,
          review_id: review_id,
          platform: 'facebook', // Default platform
          content: {
            caption: aiResponse.caption,
            hashtags: aiResponse.hashtags,
            rating: review.rating,
            customer_name: review.customer_name,
            image_url: imageUrl,
            business_name: business.name,
            business_industry: business.industry,
            business_city: business.city
          },
          status: 'draft'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating social post:', insertError);
        return res.status(500).json({ error: 'Failed to create social post' });
      }

      // Log telemetry event
      await supabase.rpc('log_telemetry_event', {
        p_business_id: profile.business_id,
        p_event_type: 'social_post_prepared',
        p_event_data: {
          social_post_id: socialPost.id,
          review_id: review_id,
          platform: 'facebook'
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Social post prepared successfully',
        social_post: socialPost,
        caption: aiResponse.caption,
        hashtags: aiResponse.hashtags,
        image_url: imageUrl
      });

    } catch (aiError) {
      console.error('Error generating AI content:', aiError);
      
      // Fallback to simple template
      const fallbackCaption = `Thank you ${review.customer_name || 'Customer'} for the ${review.rating}-star review! We're thrilled you had a great experience with ${business.name}. #${business.industry.replace(/\s+/g, '')} #${business.city.replace(/\s+/g, '')} #CustomerSatisfaction`;

      const { data: socialPost, error: insertError } = await supabase
        .from('social_posts')
        .insert({
          business_id: profile.business_id,
          review_id: review_id,
          platform: 'facebook',
          content: {
            caption: fallbackCaption,
            hashtags: [`#${business.industry.replace(/\s+/g, '')}`, `#${business.city.replace(/\s+/g, '')}`, '#CustomerSatisfaction'],
            rating: review.rating,
            customer_name: review.customer_name,
            business_name: business.name,
            fallback: true
          },
          status: 'draft'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating fallback social post:', insertError);
        return res.status(500).json({ error: 'Failed to create social post' });
      }

      return res.status(200).json({
        success: true,
        message: 'Social post prepared with fallback content',
        social_post: socialPost,
        caption: fallbackCaption,
        hashtags: [`#${business.industry.replace(/\s+/g, '')}`, `#${business.city.replace(/\s+/g, '')}`, '#CustomerSatisfaction'],
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error in prepare-post endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
