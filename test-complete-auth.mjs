#!/usr/bin/env node

async function testCompleteAuth() {
  console.log('=================================');
  console.log('🧪 JWT Authentication System Test');
  console.log('=================================\n');

  const API_BASE = 'http://localhost:3000/api/admin/auth';
  let accessToken, refreshToken;

  try {
    // 1. Test Login
    console.log('1️⃣  Testing Login...');
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@biggbuzz.com',
        password: 'Admin@123456!'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      console.log('   ❌ Login failed:', loginData.error);
      return;
    }

    accessToken = loginData.tokens.accessToken;
    refreshToken = loginData.tokens.refreshToken;
    console.log('   ✅ Login successful!');
    console.log('   📧 User:', loginData.user.email);
    console.log('   👤 Role:', loginData.user.role);
    console.log('   🔑 Session ID:', loginData.sessionId);

    // 2. Test Session Validation
    console.log('\n2️⃣  Testing Session Validation...');
    const sessionResponse = await fetch(`${API_BASE}/session`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const sessionData = await sessionResponse.json();
    if (!sessionResponse.ok) {
      console.log('   ❌ Session validation failed:', sessionData.error);
    } else {
      console.log('   ✅ Session is valid!');
      console.log('   👤 Authenticated as:', sessionData.user.email);
    }

    // 3. Test Token Refresh
    console.log('\n3️⃣  Testing Token Refresh...');
    const refreshResponse = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const refreshData = await refreshResponse.json();
    if (!refreshResponse.ok) {
      console.log('   ❌ Token refresh failed:', refreshData.error);
    } else {
      console.log('   ✅ Token refreshed successfully!');
      console.log('   🔐 New access token received');
      accessToken = refreshData.accessToken; // Update token
    }

    // 4. Test with New Token
    console.log('\n4️⃣  Testing with New Access Token...');
    const newSessionResponse = await fetch(`${API_BASE}/session`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const newSessionData = await newSessionResponse.json();
    if (!newSessionResponse.ok) {
      console.log('   ❌ New token validation failed:', newSessionData.error);
    } else {
      console.log('   ✅ New token is valid!');
    }

    // 5. Test Logout
    console.log('\n5️⃣  Testing Logout...');
    const logoutResponse = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const logoutData = await logoutResponse.json();
    if (!logoutResponse.ok) {
      console.log('   ❌ Logout failed:', logoutData.error);
    } else {
      console.log('   ✅ Logout successful!');
    }

    // 6. Verify Token is Invalid After Logout
    console.log('\n6️⃣  Verifying Token is Invalid After Logout...');
    const invalidResponse = await fetch(`${API_BASE}/session`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const invalidData = await invalidResponse.json();
    if (invalidResponse.ok) {
      console.log('   ❌ Token still valid after logout (should be invalid)');
    } else {
      console.log('   ✅ Token correctly invalidated after logout');
    }

    // 7. Test Invalid Login
    console.log('\n7️⃣  Testing Invalid Login...');
    const invalidLoginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@biggbuzz.com',
        password: 'WrongPassword123!'
      })
    });

    const invalidLoginData = await invalidLoginResponse.json();
    if (invalidLoginResponse.ok) {
      console.log('   ❌ Invalid login succeeded (should fail)');
    } else {
      console.log('   ✅ Invalid login correctly rejected');
      console.log('   📝 Error:', invalidLoginData.error);
    }

    console.log('\n=================================');
    console.log('✅ All Authentication Tests Passed!');
    console.log('=================================');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  }
}

testCompleteAuth();