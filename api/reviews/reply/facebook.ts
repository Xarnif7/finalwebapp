import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface ReplyRequest {
  business_id: string;
  review_id: string;
  reply_text: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id, review_id, reply_text }: ReplyRequest = await request.json();
    
    if (!business_id || !review_id || !reply_text) {
      return NextResponse.json(
        { error: 'business_id, review_id, and reply_text are required' },
        { status: 400 }
      );
    }

    // Get the review details
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', review_id)
      .eq('business_id', business_id)
      .eq('platform', 'facebook')
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Get the Facebook review source for this business
    const { data: reviewSource, error: sourceError } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', business_id)
      .eq('platform', 'facebook')
      .eq('connected', true)
      .single();

    if (sourceError || !reviewSource) {
      return NextResponse.json(
        { error: 'No connected Facebook review source found' },
        { status: 404 }
      );
    }

    const accessToken = reviewSource.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Facebook access token found' },
        { status: 400 }
      );
    }

    // Check if we have the required permission (pages_manage_engagement)
    // This would require checking the token's permissions, but for now we'll attempt the post
    // and handle the error if it fails

    try {
      // Post reply to Facebook
      const replyUrl = `https://graph.facebook.com/v18.0/${review.external_review_id}/comments`;
      
      const response = await fetch(replyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: reply_text,
          access_token: accessToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Facebook reply error:', errorData);
        
        // Check if it's a permissions error
        if (errorData.error?.code === 190 || errorData.error?.message?.includes('permission')) {
          return NextResponse.json({
            error: 'Reply not permitted - missing pages_manage_engagement permission',
            code: 'PERMISSION_DENIED',
            suggestion: 'Copy reply and post manually on Facebook'
          }, { status: 403 });
        }
        
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const replyData = await response.json();
      
      // Update the review with reply information
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          reply_text,
          reply_posted_at: new Date().toISOString(),
          is_replied: true
        })
        .eq('id', review_id);

      if (updateError) {
        console.error('Error updating review reply status:', updateError);
      }

      // Log to audit
      await supabase
        .from('audit_log')
        .insert({
          business_id,
          user_id: reviewSource.id, // Using review source ID as user context
          entity: 'reviews',
          action: 'reply',
          details: {
            platform: 'facebook',
            review_id,
            external_review_id: review.external_review_id,
            reply_text,
            facebook_comment_id: replyData.id
          }
        });

      return NextResponse.json({
        success: true,
        message: 'Reply posted successfully',
        facebook_comment_id: replyData.id
      });

    } catch (error) {
      console.error('Facebook reply posting error:', error);
      
      // If it's a permissions error, return specific message
      if (error instanceof Error && error.message.includes('permission')) {
        return NextResponse.json({
          error: 'Reply not permitted - missing required permissions',
          code: 'PERMISSION_DENIED',
          suggestion: 'Copy reply and post manually on Facebook'
        }, { status: 403 });
      }
      
      throw error;
    }

  } catch (error) {
    console.error('Facebook reply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
