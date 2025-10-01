#!/usr/bin/env node

async function testRefresh() {
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
    
    console.log('✅ Login successful, got refresh token');
    console.log('Refresh token:', loginData.tokens.refreshToken.substring(0, 50) + '...');
    
    // Test refresh endpoint
    const refreshResponse = await fetch('http://localhost:3000/api/admin/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: loginData.tokens.refreshToken
      })
    });

    const refreshData = await refreshResponse.json();
    console.log('\n📄 Refresh Response:');
    console.log('Status:', refreshResponse.status);
    console.log('Data:', JSON.stringify(refreshData, null, 2));
    
    if (refreshResponse.ok) {
      console.log('\n✅ Token refresh successful!');
    } else {
      console.log('\n❌ Token refresh failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testRefresh();
