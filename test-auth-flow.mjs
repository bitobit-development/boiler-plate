#!/usr/bin/env node

const API_BASE = 'http://localhost:3000';
const TEST_EMAIL = 'admin@biggbuzz.com';
const TEST_PASSWORD = 'admin123';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testLogin() {
  console.log(`${colors.blue}Testing Admin Login...${colors.reset}`);

  try {
    const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log(`${colors.green}✓ Login successful!${colors.reset}`);

      // Extract tokens
      const accessToken = data.tokens?.accessToken;
      const refreshToken = data.tokens?.refreshToken;

      // Also check for cookies
      const cookies = response.headers.get('set-cookie');
      console.log('Cookies:', cookies);

      return {
        accessToken,
        refreshToken,
        sessionId: data.sessionId,
        user: data.user
      };
    } else {
      console.error(`${colors.red}✗ Login failed:${colors.reset}`, data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Login error:${colors.reset}`, error.message);
    return null;
  }
}

async function testSession(accessToken) {
  console.log(`\n${colors.blue}Testing Session Verification...${colors.reset}`);

  try {
    // Test with Bearer token
    const bearerResponse = await fetch(`${API_BASE}/api/admin/auth/session`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const bearerData = await bearerResponse.json();
    console.log('Bearer Token Response:', bearerResponse.status, JSON.stringify(bearerData, null, 2));

    if (bearerResponse.ok && bearerData.authenticated) {
      console.log(`${colors.green}✓ Session verification with Bearer token successful!${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Session verification with Bearer token failed${colors.reset}`);
    }

    // Test with cookie
    const cookieResponse = await fetch(`${API_BASE}/api/admin/auth/session`, {
      headers: {
        'Cookie': `accessToken=${accessToken}`
      }
    });

    const cookieData = await cookieResponse.json();
    console.log('Cookie Response:', cookieResponse.status, JSON.stringify(cookieData, null, 2));

    if (cookieResponse.ok && cookieData.authenticated) {
      console.log(`${colors.green}✓ Session verification with cookie successful!${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Session verification with cookie failed${colors.reset}`);
    }

  } catch (error) {
    console.error(`${colors.red}✗ Session verification error:${colors.reset}`, error.message);
  }
}

async function testDashboardStats(accessToken) {
  console.log(`\n${colors.blue}Testing Dashboard Stats...${colors.reset}`);

  try {
    const response = await fetch(`${API_BASE}/api/admin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    console.log('Status:', response.status);

    if (response.ok) {
      console.log(`${colors.green}✓ Dashboard stats retrieved successfully!${colors.reset}`);
      console.log('Stats Overview:', data.overview);
      console.log('Growth Data:', data.growth);
    } else {
      console.error(`${colors.red}✗ Dashboard stats failed:${colors.reset}`, data.error);
    }
  } catch (error) {
    console.error(`${colors.red}✗ Dashboard stats error:${colors.reset}`, error.message);
  }
}

async function testRefreshToken(refreshToken) {
  console.log(`\n${colors.blue}Testing Token Refresh...${colors.reset}`);

  try {
    const response = await fetch(`${API_BASE}/api/admin/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.accessToken) {
      console.log(`${colors.green}✓ Token refresh successful!${colors.reset}`);
      return data.accessToken;
    } else {
      console.error(`${colors.red}✗ Token refresh failed:${colors.reset}`, data.error);
      return null;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Token refresh error:${colors.reset}`, error.message);
    return null;
  }
}

async function runTests() {
  console.log(`${colors.yellow}=== Admin Authentication Flow Test ===${colors.reset}\n`);

  // Step 1: Test Login
  const loginResult = await testLogin();
  if (!loginResult) {
    console.log(`\n${colors.red}Login failed. Stopping tests.${colors.reset}`);
    process.exit(1);
  }

  const { accessToken, refreshToken } = loginResult;

  // Step 2: Test Session Verification
  await testSession(accessToken);

  // Step 3: Test Dashboard Stats
  await testDashboardStats(accessToken);

  // Step 4: Test Token Refresh
  const newAccessToken = await testRefreshToken(refreshToken);

  // Step 5: Test with new access token
  if (newAccessToken) {
    console.log(`\n${colors.blue}Testing with refreshed token...${colors.reset}`);
    await testDashboardStats(newAccessToken);
  }

  console.log(`\n${colors.yellow}=== Tests Complete ===${colors.reset}`);
}

// Run the tests
runTests().catch(console.error);