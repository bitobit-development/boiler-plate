#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

// Test endpoints
const endpoints = [
  '/api/admin/dashboard/stats',
  '/api/admin/dashboard/activity?limit=10',
  '/api/admin/registrations?page=1&limit=10&search=&sortBy=submittedAt&sortOrder=desc'
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n📍 Testing: ${endpoint}`);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    let data = null;

    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Could not parse response' };
    }

    if (status === 200) {
      console.log(`✅ SUCCESS (${status})`);

      // Show summary of response
      if (endpoint.includes('stats')) {
        console.log('  - Overview:', data.overview ? 'Present' : 'Missing');
        console.log('  - Growth:', data.growth ? 'Present' : 'Missing');
        console.log('  - Breakdowns:', data.breakdowns ? 'Present' : 'Missing');
      } else if (endpoint.includes('activity')) {
        console.log('  - Activities:', Array.isArray(data.activities) ? `${data.activities.length} items` : 'Missing');
        console.log('  - Stats:', data.stats ? 'Present' : 'Missing');
      } else if (endpoint.includes('registrations')) {
        console.log('  - Registrations:', Array.isArray(data.registrations) ? `${data.registrations.length} items` : 'Missing');
        console.log('  - Pagination:', data.pagination ? 'Present' : 'Missing');
        console.log('  - Total:', data.total !== undefined ? data.total : 'Missing');
      }
    } else if (status === 401 || status === 403) {
      console.log(`🔒 AUTH REQUIRED (${status}) - This is expected without authentication`);
    } else if (status === 404) {
      console.log(`❌ NOT FOUND (${status})`);
      console.log('  Error:', data.error || 'Endpoint not found');
    } else if (status === 500) {
      console.log(`❌ SERVER ERROR (${status})`);
      console.log('  Error:', data.error || 'Internal server error');
    } else {
      console.log(`⚠️  UNEXPECTED STATUS (${status})`);
      console.log('  Response:', JSON.stringify(data, null, 2));
    }

    return { endpoint, status, success: status === 200 || status === 401 || status === 403 };
  } catch (error) {
    console.log(`❌ NETWORK ERROR: ${error.message}`);
    return { endpoint, status: 0, success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Admin API Endpoints');
  console.log('================================');

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }

  console.log('\n📊 Test Summary');
  console.log('================');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\n❌ Failed endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.endpoint} (Status: ${r.status})`);
    });
  }

  console.log('\n✨ Note: 401/403 errors are expected without authentication.');
  console.log('   The important thing is that endpoints exist and don\'t return 404/500.');
}

// Run tests
runTests().catch(console.error);