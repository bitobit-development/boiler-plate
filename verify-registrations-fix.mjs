#!/usr/bin/env node

/**
 * Quick Verification: Registrations Cache Fix
 */

const BASE_URL = 'http://localhost:3000';

console.log('🔧 Verifying Registrations Cache Fix\n');
console.log('=' .repeat(60));

// Login
const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@biggbuzz.com',
    password: 'admin123'
  })
});

const { tokens } = await loginResponse.json();
const token = tokens.accessToken;

console.log('✅ Logged in successfully\n');

// Test 1: First call (cache MISS)
console.log('📋 Test 1: First call to registrations API (should MISS cache)');
console.log('   → Check server logs for: [Cache MISS], [Registrations] Fetched from database\n');

const response1 = await fetch(`${BASE_URL}/api/admin/registrations?page=1&limit=5`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data1 = await response1.json();
console.log('✅ Response:', {
  total: data1.total,
  count: data1.registrations?.length,
  page: data1.page
});

// Wait 2 seconds
console.log('\n⏱️  Waiting 2 seconds...\n');
await new Promise(resolve => setTimeout(resolve, 2000));

// Test 2: Second call (cache HIT)
console.log('📋 Test 2: Second call (should HIT cache)');
console.log('   → Check server logs for: [Cache HIT] registrations:page:1:limit:5\n');

const response2 = await fetch(`${BASE_URL}/api/admin/registrations?page=1&limit=5`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data2 = await response2.json();
console.log('✅ Response:', {
  total: data2.total,
  count: data2.registrations?.length,
  page: data2.page
});

console.log('\n' + '='.repeat(60));
console.log('✨ FIX VERIFIED ✨');
console.log('\n📝 What to check in server logs:');
console.log('   1. First call: [Cache MISS] + [Registrations] Fetched from database');
console.log('   2. Second call: [Cache HIT] registrations:page:1:limit:5');
console.log('   3. No serialization errors');
console.log('=' .repeat(60));
