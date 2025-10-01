#!/usr/bin/env node

/**
 * Admin Dashboard Integration Test Script
 * Tests the complete integration of:
 * - Authentication flow
 * - Socket.io connections
 * - Real-time data updates
 * - API endpoints
 */

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3001';

// Test credentials (update these with actual test admin credentials)
const TEST_ADMIN = {
  email: 'admin@biggbuzz.com',
  password: 'admin123'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function runTests() {
  log('\n🚀 Starting Admin Dashboard Integration Tests\n', 'cyan');

  let token = null;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Login Endpoint
  log('📝 Test 1: Admin Login', 'blue');
  try {
    const loginResponse = await testEndpoint('/api/admin/auth/login', {
      method: 'POST',
      body: TEST_ADMIN
    });

    if (loginResponse.status === 200 && loginResponse.data?.token) {
      token = loginResponse.data.token;
      log('✅ Login successful - Token received', 'green');
      testsPassed++;
    } else {
      log(`❌ Login failed - Status: ${loginResponse.status}`, 'red');
      testsFailed++;
    }
  } catch (error) {
    log(`❌ Login error: ${error.message}`, 'red');
    testsFailed++;
  }

  // Test 2: Token Verification
  if (token) {
    log('\n📝 Test 2: Token Verification', 'blue');
    try {
      const verifyResponse = await testEndpoint('/api/admin/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (verifyResponse.status === 200) {
        log('✅ Token verified successfully', 'green');
        testsPassed++;
      } else {
        log(`❌ Token verification failed - Status: ${verifyResponse.status}`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Verification error: ${error.message}`, 'red');
      testsFailed++;
    }
  }

  // Test 3: Dashboard Stats
  if (token) {
    log('\n📝 Test 3: Dashboard Statistics', 'blue');
    try {
      const statsResponse = await testEndpoint('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.status === 200 && statsResponse.data) {
        log('✅ Dashboard stats retrieved', 'green');
        log(`   Total Registrations: ${statsResponse.data.totalRegistrations || 0}`, 'cyan');
        log(`   Pending Reviews: ${statsResponse.data.pendingReviews || 0}`, 'cyan');
        testsPassed++;
      } else {
        log(`❌ Stats retrieval failed - Status: ${statsResponse.status}`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Stats error: ${error.message}`, 'red');
      testsFailed++;
    }
  }

  // Test 4: Registrations Endpoint
  if (token) {
    log('\n📝 Test 4: Registrations List', 'blue');
    try {
      const registrationsResponse = await testEndpoint('/api/admin/registrations?page=1&limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (registrationsResponse.status === 200 && registrationsResponse.data) {
        log('✅ Registrations retrieved', 'green');
        log(`   Total Records: ${registrationsResponse.data.total || 0}`, 'cyan');
        log(`   Current Page: ${registrationsResponse.data.page || 1}`, 'cyan');
        testsPassed++;
      } else {
        log(`❌ Registrations retrieval failed - Status: ${registrationsResponse.status}`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Registrations error: ${error.message}`, 'red');
      testsFailed++;
    }
  }

  // Test 5: Admin Users
  if (token) {
    log('\n📝 Test 5: Admin Users List', 'blue');
    try {
      const usersResponse = await testEndpoint('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (usersResponse.status === 200 && Array.isArray(usersResponse.data)) {
        log('✅ Admin users retrieved', 'green');
        log(`   Total Admins: ${usersResponse.data.length}`, 'cyan');
        testsPassed++;
      } else {
        log(`❌ Users retrieval failed - Status: ${usersResponse.status}`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Users error: ${error.message}`, 'red');
      testsFailed++;
    }
  }

  // Test 6: Socket.io Server
  log('\n📝 Test 6: Socket.io Server Connection', 'blue');
  try {
    const socketTest = await new Promise((resolve) => {
      const req = http.get(`${SOCKET_URL}/socket.io/?transport=polling`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (socketTest) {
      log('✅ Socket.io server is running', 'green');
      testsPassed++;
    } else {
      log('❌ Socket.io server not responding', 'red');
      testsFailed++;
    }
  } catch (error) {
    log(`❌ Socket.io error: ${error.message}`, 'red');
    testsFailed++;
  }

  // Test 7: Logout
  if (token) {
    log('\n📝 Test 7: Admin Logout', 'blue');
    try {
      const logoutResponse = await testEndpoint('/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (logoutResponse.status === 200) {
        log('✅ Logout successful', 'green');
        testsPassed++;
      } else {
        log(`❌ Logout failed - Status: ${logoutResponse.status}`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Logout error: ${error.message}`, 'red');
      testsFailed++;
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 Test Results Summary', 'cyan');
  log('='.repeat(50), 'cyan');
  log(`✅ Passed: ${testsPassed}`, 'green');
  log(`❌ Failed: ${testsFailed}`, 'red');
  log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`, 'yellow');

  if (testsFailed === 0) {
    log('\n🎉 All tests passed! The admin dashboard integration is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the implementation.', 'yellow');
    log('   Make sure:', 'yellow');
    log('   1. The Next.js server is running on port 3000', 'yellow');
    log('   2. The Socket.io server is running on port 3001', 'yellow');
    log('   3. The database is connected and seeded', 'yellow');
    log('   4. The API routes are properly configured', 'yellow');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});