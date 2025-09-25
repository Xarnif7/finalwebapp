// Test a specific place_id to see if it has reviews
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_PLACES_API_KEY not found');
  process.exit(1);
}

// Test with Shirley Dentistry place_id (you'll need to get this from the connection attempt)
const testPlaceId = process.argv[2];

if (!testPlaceId) {
  console.log('Usage: node test-place-id.js <place_id>');
  console.log('Example: node test-place-id.js ChIJN1t_tDeuEmsRUsoyG83frY4');
  process.exit(1);
}

console.log('=== TESTING PLACE ID ===');
console.log('Place ID:', testPlaceId);

const testUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${testPlaceId}&fields=name,rating,reviews,user_ratings_total,formatted_address&key=${apiKey}`;

console.log('Testing URL:', testUrl);

try {
  const response = await fetch(testUrl);
  const data = await response.json();
  
  console.log('Response status:', response.status);
  console.log('API response status:', data.status);
  
  if (data.status === 'OK') {
    console.log('✅ Place ID is valid!');
    console.log('Business name:', data.result.name);
    console.log('Address:', data.result.formatted_address);
    console.log('Rating:', data.result.rating);
    console.log('Total ratings:', data.result.user_ratings_total);
    console.log('Reviews found:', data.result.reviews?.length || 0);
    
    if (data.result.reviews && data.result.reviews.length > 0) {
      console.log('✅ Reviews are available!');
      console.log('Sample reviews:');
      data.result.reviews.slice(0, 3).forEach((review, i) => {
        console.log(`  ${i+1}. ${review.author_name} (${review.rating}⭐): ${review.text.substring(0, 100)}...`);
      });
    } else {
      console.log('⚠️ No reviews returned');
    }
  } else {
    console.error('❌ API Error:', data.status);
    console.error('Error message:', data.error_message);
  }
} catch (error) {
  console.error('❌ Network error:', error.message);
}
