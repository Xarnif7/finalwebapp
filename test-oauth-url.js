import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing OAuth URL generation...');

const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
const state = Buffer.from(JSON.stringify({ business_id: businessId })).toString('base64');

console.log('📋 Business ID:', businessId);
console.log('🔑 State:', state);

const authUrl = `https://api.getjobber.com/api/oauth/authorize?client_id=${process.env.JOBBER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.JOBBER_REDIRECT_URI)}&response_type=code&scope=read:all&state=${state}`;

console.log('\n🚀 Generated OAuth URL:');
console.log(authUrl);

console.log('\n🔍 URL Components:');
console.log('- Client ID:', process.env.JOBBER_CLIENT_ID);
console.log('- Redirect URI:', process.env.JOBBER_REDIRECT_URI);
console.log('- Response Type: code');
console.log('- Scope: read:all');
console.log('- State:', state);

console.log('\n🧪 Testing URL validity...');
try {
  const url = new URL(authUrl);
  console.log('✅ URL is valid');
  console.log('- Protocol:', url.protocol);
  console.log('- Host:', url.host);
  console.log('- Pathname:', url.pathname);
  console.log('- Search params:', url.searchParams.toString());
} catch (error) {
  console.error('❌ URL is invalid:', error.message);
}
