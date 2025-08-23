import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface GenerateReplyRequest {
  review_text: string;
  rating: number;
  platform: string;
  business_context: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: GenerateReplyRequest = await request.json();
    
    if (!body.review_text || !body.rating || !body.platform) {
      return NextResponse.json(
        { error: 'Missing required fields: review_text, rating, platform' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are a professional business owner responding to a customer review. 

Review: "${body.review_text}"
Rating: ${body.rating}/5 stars
Platform: ${body.platform}
Business Context: ${body.business_context}

Please write a professional, friendly, and appropriate response to this review. Consider:

1. If it's a positive review (4-5 stars): Thank the customer, acknowledge their feedback, and express appreciation
2. If it's a neutral review (3 stars): Thank them, acknowledge their feedback, and express commitment to improvement
3. If it's a negative review (1-2 stars): Apologize sincerely, acknowledge their concerns, and offer to make things right

Keep the response:
- Professional and courteous
- Under 150 words
- Specific to their feedback
- Appropriate for the platform (${body.platform})
- Focused on customer satisfaction and business improvement

Write only the response text, no additional formatting or explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional business owner who writes thoughtful, appropriate responses to customer reviews."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: 'Failed to generate reply' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reply,
      model: completion.model,
      usage: completion.usage
    });

  } catch (error) {
    console.error('AI reply generation error:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
