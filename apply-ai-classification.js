import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key available:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAIClassification() {
  try {
    console.log('=== APPLYING AI CLASSIFICATION TO EXISTING REVIEWS ===');
    
    // Get all existing reviews
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .order('review_created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }

    console.log(`Found ${reviews.length} reviews to classify`);

    for (const review of reviews) {
      console.log(`\nClassifying review: ${review.reviewer_name} (${review.rating} stars)`);
      console.log(`Current status: ${review.status}`);
      console.log(`Text: ${review.review_text.substring(0, 100)}...`);
      
      // Apply AI classification logic
      let newStatus = 'unread';
      let sentiment = 'positive';
      
      if (review.rating <= 2) {
        newStatus = 'needs_response';
        sentiment = 'negative';
      } else if (review.rating >= 4) {
        newStatus = 'unread';
        sentiment = 'positive';
      } else {
        newStatus = 'unread';
        sentiment = 'neutral';
      }

      console.log(`New classification: status=${newStatus}, sentiment=${sentiment}`);

      // Update the review
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          status: newStatus,
          sentiment: sentiment
        })
        .eq('id', review.id);

      if (updateError) {
        console.error('Error updating review:', updateError);
      } else {
        console.log(`✅ Updated review ${review.id}`);
      }
    }

    console.log('\n=== AI CLASSIFICATION COMPLETE ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

applyAIClassification();
