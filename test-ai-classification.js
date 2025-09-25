import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase URL
const supabaseUrl = 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2emtyY3R1ZGV6eWFzaW5zeW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNjc5MzI5MCwiZXhwIjoyMDUyMzY5MjkwfQ.4hKqVgJQZqQZqQZqQZqQZqQZqQZqQZqQZqQZqQZqQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAIClassification() {
  try {
    console.log('=== TESTING AI CLASSIFICATION ===');
    
    // Test the AI classification endpoint
    const testReview = {
      review_text: "Terrible service! The staff was rude and the food was cold. Would not recommend.",
      rating: 1
    };
    
    console.log('Test review:', testReview);
    
    const response = await fetch('https://myblipp.com/api/ai/classify-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testReview)
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAIClassification();
