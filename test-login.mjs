#!/usr/bin/env node

async function testLogin() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@biggbuzz.com',
        password: 'Admin@123456!'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok && data.tokens) {
      console.log('\n✅ Login successful!');
      console.log('User:', data.user);
      console.log('Session ID:', data.sessionId);
    } else {
      console.log('\n❌ Login failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
