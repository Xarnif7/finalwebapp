#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up development environment...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  
  const envContent = `# Local development environment variables
# Replace these with your actual Supabase values

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_INTERNAL_API_KEY=your_internal_api_key
VITE_APP_BASE_URL=http://localhost:5173

# Server-side only (used by run-migration.js). Do not commit real values.
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Feature flags
VITE_FEATURE_CONVERSATIONS_LITE=false
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file');
  console.log('⚠️  Please update .env.local with your actual Supabase credentials\n');
} else {
  console.log('✅ .env.local already exists');
}

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  const { execSync } = require('child_process');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} else {
  console.log('✅ Dependencies already installed');
}

console.log('\n🎯 Next steps:');
console.log('1. Update .env.local with your Supabase credentials');
console.log('2. Run: npm run dev');
console.log('3. Open: http://localhost:5173');
console.log('\n💡 If you see any errors, check the console output above');
