const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkReviewRequests() {
  console.log('Checking recent review requests...');
  
  try {
    const { data, error } = await supabase
      .from('review_requests')
      .select('id, review_link, created_at, status, channel')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Recent review requests:');
    data.forEach((r, i) => {
      console.log(`${i+1}. ID: ${r.id}`);
      console.log(`   Link: ${r.review_link}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Channel: ${r.channel}`);
      console.log(`   Created: ${r.created_at}`);
      console.log('---');
    });
    
    // Check if any have old format
    const oldFormat = data.filter(r => r.review_link && r.review_link.includes('/r/'));
    if (oldFormat.length > 0) {
      console.log(`\nFound ${oldFormat.length} review requests with old QR redirect format:`);
      oldFormat.forEach(r => {
        console.log(`- ID ${r.id}: ${r.review_link}`);
      });
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkReviewRequests();
