import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2emtyY3R1ZGV6eWFzaW5zeW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNjc5MzI5MCwiZXhwIjoyMDUyMzY5MjkwfQ.4hKqVgJQZqQZqQZqQZqQZqQZqQZqQZqQZqQZqQZqQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function reclassifyExistingReviews() {
  try {
    console.log('=== RECLASSIFYING EXISTING REVIEWS ===');
    
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

    console.log(`Found ${reviews.length} reviews to reclassify`);

    for (const review of reviews) {
      console.log(`\nReclassifying review: ${review.reviewer_name} (${review.rating} stars)`);
      console.log(`Text: ${review.review_text.substring(0, 100)}...`);
      
      // Call the AI classification endpoint
      try {
        const response = await fetch('https://myblipp.com/api/ai/classify-review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            review_text: review.review_text,
            rating: review.rating
          })
        });

        const result = await response.json();
        console.log('AI Classification result:', result);

        if (result.success && result.classification) {
          // Update the review with new classification
          const { error: updateError } = await supabase
            .from('reviews')
            .update({
              status: result.classification.status,
              sentiment: result.classification.sentiment
            })
            .eq('id', review.id);

          if (updateError) {
            console.error('Error updating review:', updateError);
          } else {
            console.log(`✅ Updated review ${review.id} with status: ${result.classification.status}`);
          }
        }
      } catch (error) {
        console.error('Error classifying review:', error);
      }
    }

    console.log('\n=== RECLASSIFICATION COMPLETE ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

reclassifyExistingReviews();
