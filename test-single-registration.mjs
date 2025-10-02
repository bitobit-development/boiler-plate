#!/usr/bin/env node

/**
 * Test script for single registration API endpoint
 * Tests the /api/admin/registrations/[id] endpoint
 */

const API_BASE = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Helper function to pretty print JSON
function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
}

// Store auth token
let authToken = null;
let registrationId = null;

async function login() {
  logSection('1. Admin Login');

  try {
    const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@biggbuzz.com',
        password: 'admin123'
      })
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token || data.access_token || data.accessToken || data.tokens?.accessToken;
      logSuccess('Login successful');
      if (authToken) {
        logInfo(`Token received: ${authToken.substring(0, 20)}...`);
        if (data.user) {
          logInfo(`Logged in as: ${data.user.email} (${data.user.role})`);
        }
      } else {
        logWarning('No token found in response');
        console.log('Response data:', data);
      }
      return true;
    } else {
      logError(`Login failed: ${data.error}`);
      return false;
    }
  } catch (error) {
    logError(`Login error: ${error.message}`);
    return false;
  }
}

async function getRegistrationsList() {
  logSection('2. Get Registrations List (to find an ID)');

  try {
    const response = await fetch(`${API_BASE}/api/admin/registrations?limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.registrations && data.registrations.length > 0) {
      registrationId = data.registrations[0].id;
      logSuccess(`Found ${data.registrations.length} registrations`);
      logInfo(`Selected registration ID: ${registrationId}`);
      logInfo(`Name: ${data.registrations[0].name} ${data.registrations[0].surname}`);
      logInfo(`Email: ${data.registrations[0].email}`);
      logInfo(`Status: ${data.registrations[0].status}`);
      return true;
    } else if (response.ok && data.registrations?.length === 0) {
      logWarning('No registrations found in database');
      logInfo('Creating a test registration...');

      // Create a test registration
      const createResponse = await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          surname: 'User',
          email: `test${Date.now()}@example.com`,
          mobile: `+1555${Date.now().toString().slice(-7)}`,
          ageVerified: true,
          source: 'test-script',
          customFields: {
            website: 'https://example.com',
            documents: [
              { name: 'test.pdf', type: 'pdf', size: 1024, url: 'https://example.com/test.pdf' }
            ]
          }
        })
      });

      if (createResponse.ok) {
        logSuccess('Test registration created');
        // Get the list again
        return await getRegistrationsList();
      } else {
        logError('Failed to create test registration');
        return false;
      }
    } else {
      logError(`Failed to get registrations: ${data.error}`);
      return false;
    }
  } catch (error) {
    logError(`Get registrations error: ${error.message}`);
    return false;
  }
}

async function testGetSingleRegistration(id) {
  logSection(`3. Test GET /api/admin/registrations/${id}`);

  logInfo(`Fetching registration: ${id}`);

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/api/admin/registrations/${id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const data = await response.json();

    logInfo(`Response time: ${endTime - startTime}ms`);
    logInfo(`Status code: ${response.status}`);

    if (response.ok) {
      logSuccess('Registration fetched successfully');

      const reg = data.registration;
      console.log('\n📋 Registration Details:');
      console.log('─'.repeat(30));
      console.log(`ID: ${reg.id}`);
      console.log(`Name: ${reg.name} ${reg.surname}`);
      console.log(`Email: ${reg.email}`);
      console.log(`Mobile: ${reg.mobile}`);
      console.log(`Status: ${reg.status}`);
      console.log(`Source: ${reg.source || 'N/A'}`);
      console.log(`Age Verified: ${reg.ageVerified}`);
      console.log(`Email Verified: ${reg.emailVerified}`);
      console.log(`Mobile Verified: ${reg.mobileVerified}`);
      console.log(`Created: ${new Date(reg.createdAt).toLocaleString()}`);
      console.log(`Updated: ${new Date(reg.updatedAt).toLocaleString()}`);

      if (reg.country || reg.region || reg.city) {
        console.log('\n📍 Location:');
        console.log(`Country: ${reg.country || 'N/A'}`);
        console.log(`Region: ${reg.region || 'N/A'}`);
        console.log(`City: ${reg.city || 'N/A'}`);
      }

      if (reg.campaign || reg.utmSource) {
        console.log('\n📊 Campaign Info:');
        console.log(`Campaign: ${reg.campaign || 'N/A'}`);
        console.log(`UTM Source: ${reg.utmSource || 'N/A'}`);
        console.log(`UTM Medium: ${reg.utmMedium || 'N/A'}`);
        console.log(`UTM Campaign: ${reg.utmCampaign || 'N/A'}`);
      }

      if (reg.auditLogs && reg.auditLogs.length > 0) {
        console.log('\n📜 Recent Audit Logs:');
        console.log('─'.repeat(30));
        reg.auditLogs.slice(0, 5).forEach(log => {
          console.log(`• ${log.action} by ${log.adminEmail} - ${log.description}`);
          console.log(`  ${new Date(log.createdAt).toLocaleString()}`);
        });
        if (reg.auditLogs.length > 5) {
          console.log(`  ... and ${reg.auditLogs.length - 5} more`);
        }
      }

      if (reg.statusHistory && reg.statusHistory.length > 0) {
        console.log('\n📈 Status History:');
        console.log('─'.repeat(30));
        reg.statusHistory.forEach(history => {
          console.log(`• ${history.previousStatus} → ${history.status}`);
          console.log(`  Changed by ${history.changedBy}`);
          console.log(`  ${new Date(history.changedAt).toLocaleString()}`);
          if (history.reason) {
            console.log(`  Reason: ${history.reason}`);
          }
        });
      }

      if (reg.documentMetadata && reg.documentMetadata.length > 0) {
        console.log('\n📄 Documents:');
        console.log('─'.repeat(30));
        reg.documentMetadata.forEach(doc => {
          console.log(`• ${doc.name} (${doc.type})`);
          console.log(`  Size: ${doc.size} bytes`);
          console.log(`  Status: ${doc.status}`);
        });
      }

      if (reg.customFields && Object.keys(reg.customFields).length > 0) {
        console.log('\n🔧 Custom Fields:');
        console.log(prettyJson(reg.customFields));
      }

      return true;
    } else {
      logError(`Failed to fetch registration: ${data.error}`);
      console.log('Response:', prettyJson(data));
      return false;
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
    return false;
  }
}

async function testInvalidId() {
  logSection('4. Test Invalid ID Handling');

  const tests = [
    { id: 'invalid-id', expected: 400, description: 'Invalid format' },
    { id: '00000000-0000-0000-0000-000000000000', expected: 404, description: 'Valid UUID but not found' }
  ];

  for (const test of tests) {
    logInfo(`Testing ${test.description}: ${test.id}`);

    try {
      const response = await fetch(`${API_BASE}/api/admin/registrations/${test.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.status === test.expected) {
        logSuccess(`Correctly returned ${test.expected}: ${data.error}`);
      } else {
        logError(`Expected ${test.expected}, got ${response.status}`);
      }
    } catch (error) {
      logError(`Test error: ${error.message}`);
    }
  }
}

async function testCaching() {
  logSection('5. Test Caching Performance');

  if (!registrationId) {
    logWarning('No registration ID available for caching test');
    return;
  }

  logInfo('Making 5 consecutive requests to test caching...');

  const times = [];
  for (let i = 1; i <= 5; i++) {
    const startTime = Date.now();

    const response = await fetch(`${API_BASE}/api/admin/registrations/${registrationId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    times.push(responseTime);

    if (response.ok) {
      logInfo(`Request ${i}: ${responseTime}ms`);
    } else {
      logError(`Request ${i} failed`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log('\n📊 Performance Summary:');
  console.log(`Average: ${avgTime.toFixed(2)}ms`);
  console.log(`Min: ${minTime}ms`);
  console.log(`Max: ${maxTime}ms`);

  if (times[1] < times[0] * 0.5) {
    logSuccess('Caching appears to be working (subsequent requests are faster)');
  } else {
    logInfo('Cache performance not clearly observable');
  }
}

async function testNoAuth() {
  logSection('6. Test Unauthorized Access');

  if (!registrationId) {
    logWarning('No registration ID available for auth test');
    return;
  }

  logInfo('Attempting to access without authentication...');

  try {
    const response = await fetch(`${API_BASE}/api/admin/registrations/${registrationId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.status === 401) {
      logSuccess(`Correctly denied access: ${data.error}`);
    } else {
      logError(`Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
  }
}

async function runTests() {
  console.log(colors.bright + colors.magenta);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     Single Registration API Endpoint Test     ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // 1. Login
  if (!await login()) {
    logError('Cannot proceed without authentication');
    process.exit(1);
  }

  // 2. Get a registration ID
  if (!await getRegistrationsList()) {
    logError('Cannot proceed without a registration ID');
    process.exit(1);
  }

  // 3. Test fetching single registration
  await testGetSingleRegistration(registrationId);

  // 4. Test invalid IDs
  await testInvalidId();

  // 5. Test caching
  await testCaching();

  // 6. Test unauthorized access
  await testNoAuth();

  logSection('Test Complete');
  logSuccess('All tests completed');
}

// Run the tests
runTests().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});