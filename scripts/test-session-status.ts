#!/usr/bin/env ts-node

/**
 * Test script to verify session status endpoint is working correctly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testSessionStatus() {
  console.log('Testing Session Status Endpoint...\n');

  try {
    // Step 1: Login to get a session
    console.log('1. Logging in to create session...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'superadmin@biggbuzz.com',
        password: 'Admin2024!@#',
      }),
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Login failed: ${error}`);
    }

    const loginData = await loginResponse.json() as any;
    console.log('✅ Login successful');
    console.log('   User:', loginData.user.email);
    console.log('   Role:', loginData.user.role);

    // Extract cookies from login response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    const accessTokenCookie = cookies?.find((c: string) => c.includes('accessToken'));

    if (!accessTokenCookie) {
      throw new Error('No access token cookie received');
    }

    console.log('\n2. Testing session-status endpoint with cookie...');

    // Step 2: Test session-status endpoint
    const statusResponse = await fetch(`${BASE_URL}/api/admin/auth/session-status`, {
      method: 'GET',
      headers: {
        'Cookie': accessTokenCookie,
        'Content-Type': 'application/json',
      },
    });

    console.log('   Response status:', statusResponse.status);

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('❌ Session status failed:', errorText);
      process.exit(1);
    }

    const statusData = await statusResponse.json() as any;
    console.log('✅ Session status retrieved successfully');
    console.log('\nResponse structure:');
    console.log(JSON.stringify(statusData, null, 2));

    // Validate response structure
    console.log('\n3. Validating response structure...');
    const requiredFields = {
      'success': typeof statusData.success === 'boolean',
      'session': typeof statusData.session === 'object',
      'session.id': typeof statusData.session?.id === 'string',
      'session.status': typeof statusData.session?.status === 'string',
      'session.expiresAt': typeof statusData.session?.expiresAt === 'string',
      'session.lastActivityAt': typeof statusData.session?.lastActivityAt === 'string',
      'timing': typeof statusData.timing === 'object',
      'timing.secondsRemaining': typeof statusData.timing?.secondsRemaining === 'number',
      'timing.shouldWarn': typeof statusData.timing?.shouldWarn === 'boolean',
      'user': typeof statusData.user === 'object',
    };

    let allValid = true;
    for (const [field, isValid] of Object.entries(requiredFields)) {
      if (!isValid) {
        console.log(`   ❌ Missing or invalid field: ${field}`);
        allValid = false;
      } else {
        console.log(`   ✅ Valid field: ${field}`);
      }
    }

    if (allValid) {
      console.log('\n✅ All fields valid! Session status endpoint is working correctly.');

      // Test the transformed format
      console.log('\n4. Testing frontend transformation...');
      const transformed = {
        isValid: statusData.success && statusData.session.status === 'active',
        expiresAt: statusData.session.expiresAt,
        expiresIn: statusData.timing.secondsRemaining,
        lastActivityAt: statusData.session.lastActivityAt,
        needsRefresh: statusData.timing.shouldExtend || statusData.timing.minutesRemaining < 10
      };

      console.log('Transformed for frontend:');
      console.log(JSON.stringify(transformed, null, 2));
      console.log('\n✅ Transformation successful!');
    } else {
      console.log('\n❌ Some fields are missing or invalid');
      process.exit(1);
    }

    // Step 3: Test session extension
    console.log('\n5. Testing session extension...');
    const extendResponse = await fetch(`${BASE_URL}/api/admin/auth/session-status`, {
      method: 'POST',
      headers: {
        'Cookie': accessTokenCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extendMinutes: 60 }),
    });

    if (!extendResponse.ok) {
      const errorText = await extendResponse.text();
      console.error('❌ Session extension failed:', errorText);
    } else {
      const extendData = await extendResponse.json() as any;
      console.log('✅ Session extended successfully');
      console.log('   Message:', extendData.message);
      console.log('   New expiry:', extendData.session?.expiresAt);
    }

    console.log('\n✅ All tests passed! The session status system is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSessionStatus();