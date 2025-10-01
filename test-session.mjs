#!/usr/bin/env node

async function testSession() {
  try {
    console.log('Testing session API...');

    // First login
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

    const accessToken = loginData.tokens.accessToken;
    console.log('✅ Login successful! Got access token.');

    // Test session endpoint with token
    const sessionResponse = await fetch('http://localhost:3000/api/admin/auth/session', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Cookie': `accessToken=${accessToken}`
      }
    });

    const sessionData = await sessionResponse.json();

    if (sessionResponse.ok) {
      console.log('✅ Session valid!');
      console.log(JSON.stringify(sessionData, null, 2));
    } else {
      console.log('❌ Session validation failed:');
      console.log(JSON.stringify(sessionData, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSession();