#!/usr/bin/env node

async function testRegistrationsFetch() {
  try {
    // First login
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@biggbuzz.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.tokens.accessToken;
    console.log('✅ Login successful');

    // Test registrations API
    console.log('\n📊 Testing registrations API...');
    const registrationsResponse = await fetch('http://localhost:3000/api/admin/registrations?page=1&limit=5&sortBy=submittedAt&sortOrder=desc', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const registrationsData = await registrationsResponse.json();
    
    console.log('Response status:', registrationsResponse.status);
    console.log('Total registrations:', registrationsData.total);
    console.log('Page:', registrationsData.page);
    console.log('Total pages:', registrationsData.totalPages);
    console.log('Registrations returned:', registrationsData.registrations?.length || 0);
    
    if (registrationsData.registrations && registrationsData.registrations.length > 0) {
      console.log('\n✅ API is working correctly!');
      console.log('First registration:', {
        name: registrationsData.registrations[0].name,
        email: registrationsData.registrations[0].email,
        status: registrationsData.registrations[0].status
      });
    } else {
      console.log('\n❌ No registrations returned');
    }

    // Test with status filter
    console.log('\n📊 Testing with status filter (pending)...');
    const pendingResponse = await fetch('http://localhost:3000/api/admin/registrations?page=1&limit=5&status=pending', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const pendingData = await pendingResponse.json();
    console.log('Pending registrations:', pendingData.total);

  } catch (error) {
    console.error('Error:', error);
  }
}

testRegistrationsFetch();
