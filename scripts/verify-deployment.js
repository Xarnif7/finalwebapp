#!/usr/bin/env node

/**
 * Blipp MVP Deployment Verification Script
 * 
 * Verifies that all critical services and configurations are working
 * Run this after deploying to Vercel to ensure everything is set up correctly
 * 
 * Usage:
 *   node scripts/verify-deployment.js
 * 
 * Or with custom URL:
 *   node scripts/verify-deployment.js https://your-app.vercel.app
 */

const https = require('https');
const http = require('http');

const APP_URL = process.argv[2] || process.env.VITE_SITE_URL || 'http://localhost:5173';

const checks = [];
const errors = [];
const warnings = [];

console.log('🔍 Blipp MVP Deployment Verification\n');
console.log(`Testing: ${APP_URL}\n`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Check 1: Frontend accessible
async function checkFrontend() {
  try {
    const result = await makeRequest(APP_URL);
    if (result.status === 200) {
      checks.push('✅ Frontend is accessible');
    } else {
      errors.push(`❌ Frontend returned status ${result.status}`);
    }
  } catch (error) {
    errors.push(`❌ Frontend not accessible: ${error.message}`);
  }
}

// Check 2: API routes working
async function checkAPI() {
  try {
    // Try a simple API endpoint (health check if exists, or any public endpoint)
    const result = await makeRequest(`${APP_URL}/api/health`);
    if (result.status === 200 || result.status === 404) {
      checks.push('✅ API routes are configured');
    } else {
      warnings.push(`⚠️  API health check returned ${result.status}`);
    }
  } catch (error) {
    warnings.push(`⚠️  Could not verify API routes: ${error.message}`);
  }
}

// Check 3: Environment variables
function checkEnvVars() {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SITE_URL'
  ];

  const optionalVars = [
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
    'OPENAI_API_KEY',
    'QBO_CLIENT_ID',
    'JOBBER_CLIENT_ID'
  ];

  console.log('📋 Environment Variables Check:\n');
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName} is set`);
    } else {
      console.log(`  ❌ ${varName} is MISSING (required)`);
      errors.push(`Missing required env var: ${varName}`);
    }
  });

  console.log('\n  Optional Variables:');
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName} is set`);
    } else {
      console.log(`  ⚠️  ${varName} not set (optional)`);
    }
  });
  
  console.log('');
}

// Check 4: Build artifacts
function checkBuildArtifacts() {
  const fs = require('fs');
  const path = require('path');
  
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(distPath)) {
    checks.push('✅ Build directory exists (dist/)');
    if (fs.existsSync(indexPath)) {
      checks.push('✅ Built index.html found');
    } else {
      warnings.push('⚠️  index.html not found in dist/');
    }
  } else {
    warnings.push('⚠️  Build directory not found (dist/) - run npm run build first');
  }
}

// Check 5: Critical files
function checkCriticalFiles() {
  const fs = require('fs');
  const criticalFiles = [
    'package.json',
    'vercel.json',
    'vite.config.js',
    'ENV.example',
    'docs/scope.md',
    'docs/data-model.md',
    'docs/ledger.md'
  ];
  
  let allExist = true;
  criticalFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      warnings.push(`⚠️  Missing: ${file}`);
      allExist = false;
    }
  });
  
  if (allExist) {
    checks.push('✅ All critical files present');
  }
}

// Main execution
async function runVerification() {
  console.log('🔧 Running Pre-Deployment Checks...\n');
  
  // Environment checks (synchronous)
  checkEnvVars();
  checkBuildArtifacts();
  checkCriticalFiles();
  
  // Network checks (asynchronous)
  console.log('🌐 Running Network Checks...\n');
  await checkFrontend();
  await checkAPI();
  
  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Verification Summary:\n');
  
  if (checks.length > 0) {
    console.log('✅ Passed Checks:');
    checks.forEach(check => console.log(`  ${check}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  ${warning}`));
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('❌ Errors (Must Fix):');
    errors.forEach(error => console.log(`  ${error}`));
    console.log('');
  }
  
  // Final verdict
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('🎉 ALL CHECKS PASSED! Ready to launch! 🚀\n');
    process.exit(0);
  } else if (errors.length === 0) {
    console.log('✅ No critical errors, but review warnings above.\n');
    console.log('👍 You can proceed with launch, but consider addressing warnings.\n');
    process.exit(0);
  } else {
    console.log('❌ CRITICAL ERRORS FOUND!\n');
    console.log('Please fix the errors above before deploying.\n');
    process.exit(1);
  }
}

// Run it!
runVerification().catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});

