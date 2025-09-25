import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviews() {
  try {
    console.log('=== CHECKING REVIEWS IN DATABASE ===');
    
    // Check all reviews
    const { data: allReviews, error: allError } = await supabase
      .from('reviews')
      .select('*')
      .limit(10);
    
    if (allError) {
      console.error('Error fetching reviews:', allError);
      return;
    }
    
    console.log('Total reviews in database:', allReviews?.length || 0);
    
    if (allReviews && allReviews.length > 0) {
      console.log('Sample reviews:');
      allReviews.forEach((review, i) => {
        console.log(`${i + 1}. ${review.reviewer_name} - ${review.rating} stars - ${review.platform}`);
        console.log(`   Business ID: ${review.business_id}`);
        console.log(`   Created: ${review.review_created_at}`);
        console.log(`   Text: ${review.review_text?.substring(0, 100)}...`);
        console.log('');
      });
    }
    
    // Check review sources
    const { data: sources, error: sourcesError } = await supabase
      .from('review_sources')
      .select('*');
    
    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
      return;
    }
    
    console.log('Review sources:', sources?.length || 0);
    
    if (sources && sources.length > 0) {
      console.log('Connected sources:');
      sources.forEach((source, i) => {
        console.log(`${i + 1}. ${source.business_name} - ${source.platform}`);
        console.log(`   Business ID: ${source.business_id}`);
        console.log(`   External ID: ${source.external_id}`);
        console.log(`   Active: ${source.is_active}`);
        console.log('');
      });
    }
    
    // Check businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('*');
    
    if (businessesError) {
      console.error('Error fetching businesses:', businessesError);
      return;
    }
    
    console.log('Businesses:', businesses?.length || 0);
    
    if (businesses && businesses.length > 0) {
      console.log('Businesses:');
      businesses.forEach((business, i) => {
        console.log(`${i + 1}. ${business.business_name} (${business.id})`);
        console.log(`   Created by: ${business.created_by}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkReviews();
