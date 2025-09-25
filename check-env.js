import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('=== ENVIRONMENT VARIABLES ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('GOOGLE_PLACES_API_KEY:', process.env.GOOGLE_PLACES_API_KEY ? 'Set' : 'Not set');
console.log('VITE_GOOGLE_MAPS_KEY:', process.env.VITE_GOOGLE_MAPS_KEY ? 'Set' : 'Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
