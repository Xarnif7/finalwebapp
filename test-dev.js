import { createClient } from '@supabase/supabase-js';

console.log('🧪 Testing Supabase connection...');

// Test if environment variables are loaded
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('- VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');

if (supabaseUrl && supabaseKey) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');
    
    // Test a simple query
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.log('❌ Supabase connection error:', error.message);
      } else {
        console.log('✅ Supabase connection successful');
        console.log('- Current session:', data.session ? 'Signed in' : 'Not signed in');
      }
    });
  } catch (error) {
    console.log('❌ Error creating Supabase client:', error.message);
  }
} else {
  console.log('❌ Please set your Supabase credentials in .env.local');
}
