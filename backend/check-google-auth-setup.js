#!/usr/bin/env node

/**
 * Google Auth Setup Checker
 * Run this script to validate your Google OAuth configuration
 * 
 * Usage: node check-google-auth-setup.js
 */

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Checking Google Auth Configuration...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Check 1: Environment Variables
console.log('📋 Checking Environment Variables...');

const requiredEnvVars = [
  { 
    names: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'], 
    description: 'Supabase Project URL',
    example: 'https://xxxxx.supabase.co'
  },
  { 
    names: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'], 
    description: 'Supabase Anon/Public Key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  { 
    names: ['SUPABASE_SERVICE_ROLE_KEY'], 
    description: 'Supabase Service Role Key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
];

requiredEnvVars.forEach(({ names, description, example }) => {
  const value = names.map(name => process.env[name]).find(v => v);
  
  if (value) {
    console.log(`  ✅ ${description}: Found`);
    checks.passed++;
  } else {
    console.log(`  ❌ ${description}: Missing`);
    console.log(`     Set one of: ${names.join(' or ')}`);
    console.log(`     Example: ${example}`);
    checks.failed++;
  }
});

// Check optional vars
const optionalEnvVars = [
  { name: 'FRONTEND_URL', default: 'http://localhost:3001' },
  { name: 'ADMIN_URL', default: 'http://localhost:3000' },
  { name: 'PORT', default: '3000' }
];

console.log('\n⚙️  Optional Configuration:');
optionalEnvVars.forEach(({ name, default: defaultValue }) => {
  const value = process.env[name];
  if (value) {
    console.log(`  ✅ ${name}: ${value}`);
  } else {
    console.log(`  ⚠️  ${name}: Not set (will use default: ${defaultValue})`);
    checks.warnings++;
  }
});

// Check 2: Supabase URL format
console.log('\n🔗 Validating Supabase URL...');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

if (supabaseUrl) {
  if (supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')) {
    console.log(`  ✅ URL format looks correct: ${supabaseUrl}`);
    checks.passed++;
  } else {
    console.log(`  ⚠️  URL format might be incorrect: ${supabaseUrl}`);
    console.log('     Expected format: https://xxxxx.supabase.co');
    checks.warnings++;
  }
}

// Check 3: Key format
console.log('\n🔑 Validating Supabase Keys...');
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (anonKey) {
  if (anonKey.startsWith('eyJ')) {
    console.log('  ✅ Anon key format looks correct');
    checks.passed++;
  } else {
    console.log('  ⚠️  Anon key format might be incorrect');
    console.log('     JWT tokens typically start with "eyJ"');
    checks.warnings++;
  }
}

if (serviceKey) {
  if (serviceKey.startsWith('eyJ')) {
    console.log('  ✅ Service role key format looks correct');
    checks.passed++;
  } else {
    console.log('  ⚠️  Service role key format might be incorrect');
    checks.warnings++;
  }
}

// Check 4: Server Port
console.log('\n🌐 Checking Server Configuration...');
const port = process.env.PORT || 3000;

console.log(`  ℹ️  Server will run on port: ${port}`);
console.log(`  ℹ️  Backend URL will be: http://localhost:${port}`);

// Check 5: Test Backend Endpoint
console.log('\n🔌 Testing Backend Server...');

const testBackend = () => {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      if (res.statusCode === 200) {
        console.log('  ✅ Backend server is running and responding');
        checks.passed++;
        resolve(true);
      } else {
        console.log(`  ⚠️  Backend responded with status: ${res.statusCode}`);
        checks.warnings++;
        resolve(false);
      }
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log('  ⚠️  Backend server is not running');
        console.log('     Start it with: npm run dev');
      } else {
        console.log(`  ⚠️  Error connecting to backend: ${err.message}`);
      }
      checks.warnings++;
      resolve(false);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      console.log('  ⚠️  Backend connection timeout');
      checks.warnings++;
      resolve(false);
    });
  });
};

// Check 6: Supabase Connectivity
console.log('\n☁️  Testing Supabase Connectivity...');

const testSupabase = () => {
  return new Promise((resolve) => {
    if (!supabaseUrl) {
      console.log('  ⚠️  Cannot test - Supabase URL not configured');
      resolve(false);
      return;
    }

    const url = new URL(supabaseUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/auth/v1/health',
      method: 'GET',
      timeout: 5000
    };

    const req = https.get(options, (res) => {
      if (res.statusCode === 200) {
        console.log('  ✅ Supabase is reachable');
        checks.passed++;
        resolve(true);
      } else {
        console.log(`  ⚠️  Supabase responded with status: ${res.statusCode}`);
        checks.warnings++;
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log(`  ❌ Cannot reach Supabase: ${err.message}`);
      console.log('     Check your internet connection and Supabase URL');
      checks.failed++;
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log('  ⚠️  Supabase connection timeout');
      checks.warnings++;
      resolve(false);
    });
  });
};

// Run async checks
(async () => {
  await testBackend();
  await testSupabase();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Configuration Check Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Passed:   ${checks.passed}`);
  console.log(`❌ Failed:   ${checks.failed}`);
  console.log(`⚠️  Warnings: ${checks.warnings}`);
  console.log('='.repeat(50));

  if (checks.failed > 0) {
    console.log('\n❌ Configuration Issues Found!');
    console.log('\n📝 Next Steps:');
    console.log('1. Create/update your .env file in the backend directory');
    console.log('2. Add the missing environment variables');
    console.log('3. Get Supabase credentials from: https://supabase.com/dashboard');
    console.log('4. Run this script again to verify');
    console.log('\n💡 See GOOGLE_AUTH_QUICKSTART.md for detailed setup instructions');
    process.exit(1);
  } else if (checks.warnings > 0) {
    console.log('\n⚠️  Configuration has some warnings, but should work');
    console.log('\n📝 Recommendations:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Enable Google OAuth in Supabase dashboard');
    console.log('3. Test the Google auth endpoint');
    console.log('\n💡 See GOOGLE_AUTH_QUICKSTART.md for more details');
    process.exit(0);
  } else {
    console.log('\n✅ Configuration looks good!');
    console.log('\n📝 Next Steps:');
    console.log('1. If not running, start backend: npm run dev');
    console.log('2. Enable Google OAuth in Supabase dashboard');
    console.log('3. Configure frontend with Google Client ID');
    console.log('4. Test the integration!');
    console.log('\n💡 See GOOGLE_AUTH_INTEGRATION.md for complete guide');
    process.exit(0);
  }
})();

