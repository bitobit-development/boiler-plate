#!/usr/bin/env node

async function testLogout() {
  try {
    // First login to get tokens
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@biggbuzz.com',
        password: 'Admin@123456!'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      return;
    }
    
    console.log('✅ Login successful');
    console.log('Access token:', loginData.tokens.accessToken.substring(0, 50) + '...');
    
    // Test logout endpoint
    const logoutResponse = await fetch('http://localhost:3000/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.tokens.accessToken}`,
        'Cookie': `accessToken=${loginData.tokens.accessToken}; refreshToken=${loginData.tokens.refreshToken}`
      },
      body: JSON.stringify({})
    });

    const logoutData = await logoutResponse.json();
    console.log('\n🚪 Logout Response:');
    console.log('Status:', logoutResponse.status);
    console.log('Data:', JSON.stringify(logoutData, null, 2));
    
    if (logoutResponse.ok) {
      console.log('\n✅ Logout successful!');
    } else {
      console.log('\n❌ Logout failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogout();
