import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase URL from the console logs
const supabaseUrl = 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2emtyY3R1ZGV6eWFzaW5zeW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNjc5MzI5MCwiZXhwIjoyMDUyMzY5MjkwfQ.4hKqVgJQZqQZqQZqQZqQZqQZqQZqQZqQZqQZqQZqQ'; // This is the anon key from the console logs

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('=== CHECKING DATABASE DIRECTLY ===');
    
    // Check review_sources table
    console.log('\n1. Checking review_sources...');
    const { data: sources, error: sourcesError } = await supabase
      .from('review_sources')
      .select('*');
    
    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
    } else {
      console.log('Review sources found:', sources?.length || 0);
      if (sources && sources.length > 0) {
        sources.forEach((source, i) => {
          console.log(`${i + 1}. ${source.business_name} - ${source.platform}`);
          console.log(`   Business ID: ${source.business_id}`);
          console.log(`   External ID: ${source.external_id}`);
          console.log(`   Created by: ${source.created_by}`);
        });
      }
    }
    
    // Check reviews table
    console.log('\n2. Checking reviews...');
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .limit(10);
    
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
    } else {
      console.log('Reviews found:', reviews?.length || 0);
      if (reviews && reviews.length > 0) {
        reviews.forEach((review, i) => {
          console.log(`${i + 1}. ${review.reviewer_name} - ${review.rating} stars`);
          console.log(`   Business ID: ${review.business_id}`);
          console.log(`   Created by: ${review.created_by}`);
          console.log(`   Platform: ${review.platform}`);
        });
      }
    }
    
    // Check businesses table
    console.log('\n3. Checking businesses...');
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('*');
    
    if (businessesError) {
      console.error('Error fetching businesses:', businessesError);
    } else {
      console.log('Businesses found:', businesses?.length || 0);
      if (businesses && businesses.length > 0) {
        businesses.forEach((business, i) => {
          console.log(`${i + 1}. ${business.business_name} (${business.id})`);
          console.log(`   Created by: ${business.created_by}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDatabase();
