// Quick Demo Readiness Verification
// Checks key components without requiring server to be running

import fs from 'fs';
import path from 'path';

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function checkFileContent(filePath, searchText) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchText);
  } catch (error) {
    return false;
  }
}

function verifyDemoReadiness() {
  console.log('🔍 Verifying Demo Readiness...\n');

  const checks = [];

  // Check 1: Database migration file exists
  console.log('📋 Check 1: Database migration file...');
  const migrationExists = checkFileExists('create-sequences-table.sql');
  if (migrationExists) {
    console.log('✅ Database migration file exists');
    checks.push({ name: 'Database Migration', status: 'PASS' });
  } else {
    console.log('❌ Database migration file missing');
    checks.push({ name: 'Database Migration', status: 'FAIL' });
  }

  // Check 2: Server.js has sequences endpoints
  console.log('\n🔌 Check 2: API endpoints in server.js...');
  const serverExists = checkFileExists('server.js');
  if (serverExists) {
    const hasSequencesGet = checkFileContent('server.js', 'app.get(\'/api/sequences\'');
    const hasSequencesPost = checkFileContent('server.js', 'app.post(\'/api/sequences\'');
    const hasToggleEndpoint = checkFileContent('server.js', 'app.post(\'/api/sequences/:id/toggle\'');
    
    if (hasSequencesGet && hasSequencesPost && hasToggleEndpoint) {
      console.log('✅ All required API endpoints exist');
      checks.push({ name: 'API Endpoints', status: 'PASS' });
    } else {
      console.log('❌ Missing API endpoints');
      console.log('   - GET /api/sequences:', hasSequencesGet ? '✅' : '❌');
      console.log('   - POST /api/sequences:', hasSequencesPost ? '✅' : '❌');
      console.log('   - POST /api/sequences/:id/toggle:', hasToggleEndpoint ? '✅' : '❌');
      checks.push({ name: 'API Endpoints', status: 'FAIL' });
    }
  } else {
    console.log('❌ server.js file missing');
    checks.push({ name: 'API Endpoints', status: 'FAIL' });
  }

  // Check 3: Frontend components exist
  console.log('\n🎨 Check 3: Frontend components...');
  const automationWizardExists = checkFileExists('src/components/automations/AutomationWizard.jsx');
  const flowCardExists = checkFileExists('src/components/automation/FlowCard.jsx');
  const automationsPageExists = checkFileExists('src/pages/Automations.jsx');
  
  if (automationWizardExists && flowCardExists && automationsPageExists) {
    console.log('✅ All frontend components exist');
    checks.push({ name: 'Frontend Components', status: 'PASS' });
  } else {
    console.log('❌ Missing frontend components');
    console.log('   - AutomationWizard.jsx:', automationWizardExists ? '✅' : '❌');
    console.log('   - FlowCard.jsx:', flowCardExists ? '✅' : '❌');
    console.log('   - Automations.jsx:', automationsPageExists ? '✅' : '❌');
    checks.push({ name: 'Frontend Components', status: 'FAIL' });
  }

  // Check 4: Toggle functionality in FlowCard
  console.log('\n🔄 Check 4: Toggle functionality...');
  if (flowCardExists) {
    const hasToggleSwitch = checkFileContent('src/components/automation/FlowCard.jsx', 'Switch');
    const hasToggleColors = checkFileContent('src/components/automation/FlowCard.jsx', 'green-500');
    const hasToggleHandler = checkFileContent('src/components/automation/FlowCard.jsx', 'onToggle');
    
    if (hasToggleSwitch && hasToggleColors && hasToggleHandler) {
      console.log('✅ Toggle functionality implemented');
      checks.push({ name: 'Toggle Functionality', status: 'PASS' });
    } else {
      console.log('❌ Toggle functionality incomplete');
      console.log('   - Switch component:', hasToggleSwitch ? '✅' : '❌');
      console.log('   - Toggle colors:', hasToggleColors ? '✅' : '❌');
      console.log('   - Toggle handler:', hasToggleHandler ? '✅' : '❌');
      checks.push({ name: 'Toggle Functionality', status: 'FAIL' });
    }
  } else {
    console.log('❌ FlowCard component missing');
    checks.push({ name: 'Toggle Functionality', status: 'FAIL' });
  }

  // Check 5: Email and SMS services
  console.log('\n📧 Check 5: Email and SMS services...');
  const emailServiceExists = checkFileExists('src/lib/emailService.js');
  const resendServiceExists = checkFileExists('src/api/resendService.js');
  
  if (emailServiceExists || resendServiceExists) {
    console.log('✅ Email service files exist');
    checks.push({ name: 'Email Service', status: 'PASS' });
  } else {
    console.log('❌ Email service files missing');
    checks.push({ name: 'Email Service', status: 'FAIL' });
  }

  // Check 6: Environment configuration
  console.log('\n⚙️ Check 6: Environment configuration...');
  const envExampleExists = checkFileExists('ENV.example');
  const envExists = checkFileExists('.env');
  
  if (envExampleExists) {
    console.log('✅ Environment example file exists');
    checks.push({ name: 'Environment Config', status: 'PASS' });
  } else {
    console.log('❌ Environment example file missing');
    checks.push({ name: 'Environment Config', status: 'FAIL' });
  }

  // Check 7: Package.json and dependencies
  console.log('\n📦 Check 7: Package dependencies...');
  const packageExists = checkFileExists('package.json');
  if (packageExists) {
    const hasSupabase = checkFileContent('package.json', '@supabase/supabase-js');
    const hasReact = checkFileContent('package.json', 'react');
    const hasVite = checkFileContent('package.json', 'vite');
    
    if (hasSupabase && hasReact && hasVite) {
      console.log('✅ Required dependencies exist');
      checks.push({ name: 'Dependencies', status: 'PASS' });
    } else {
      console.log('❌ Missing required dependencies');
      checks.push({ name: 'Dependencies', status: 'FAIL' });
    }
  } else {
    console.log('❌ package.json missing');
    checks.push({ name: 'Dependencies', status: 'FAIL' });
  }

  // Summary
  console.log('\n📊 Verification Summary:');
  console.log('========================');
  
  let passedChecks = 0;
  let totalChecks = checks.length;
  
  checks.forEach(check => {
    const status = check.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${check.status}`);
    if (check.status === 'PASS') passedChecks++;
  });

  console.log(`\n🎯 Overall Result: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🚀 System is ready for demo!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run create-sequences-table.sql in Supabase');
    console.log('2. Start server: npm run dev');
    console.log('3. Test journey creation and toggle functionality');
    console.log('4. Practice the demo flow using DEMO_PRACTICE_GUIDE.md');
  } else {
    console.log('\n⚠️ Some components need attention before the demo.');
    console.log('Please fix the failing checks above.');
  }

  return {
    passed: passedChecks,
    total: totalChecks,
    ready: passedChecks === totalChecks
  };
}

// Run verification
const result = verifyDemoReadiness();
process.exit(result.ready ? 0 : 1);
