import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Jobber OAuth Configuration Check:');
console.log('JOBBER_CLIENT_ID:', process.env.JOBBER_CLIENT_ID ? 'Set' : 'Not set');
console.log('JOBBER_CLIENT_SECRET:', process.env.JOBBER_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('JOBBER_REDIRECT_URI:', process.env.JOBBER_REDIRECT_URI);

if (process.env.JOBBER_CLIENT_ID && process.env.JOBBER_CLIENT_SECRET) {
  const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
  const state = Buffer.from(JSON.stringify({ business_id: businessId })).toString('base64');
  
  const authUrl = `https://api.getjobber.com/api/oauth/authorize?client_id=${process.env.JOBBER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.JOBBER_REDIRECT_URI)}&response_type=code&scope=read:all&state=${state}`;
  
  console.log('\n🚀 Generated OAuth URL:');
  console.log(authUrl);
  
  console.log('\n🔗 Callback URL should be:');
  console.log(process.env.JOBBER_REDIRECT_URI);
} else {
  console.log('❌ Missing Jobber credentials');
}
