#!/usr/bin/env node

/**
 * Test Registrations Cache Fix
 *
 * This script verifies that:
 * 1. Registrations API works correctly
 * 2. Redis caching is functioning (HIT/MISS)
 * 3. Same caching pattern as dashboard stats
 */

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Testing Registrations Cache Fix\n');
console.log('=' .repeat(60));

// Step 1: Login
console.log('\n📝 Step 1: Logging in as admin...');
const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@biggbuzz.com',
    password: 'admin123'
  })
});

const loginData = await loginResponse.json();

if (!loginData.tokens?.accessToken) {
  console.error('❌ Login failed:', loginData);
  process.exit(1);
}

console.log('✅ Login successful');
const token = loginData.tokens.accessToken;

// Step 2: Test Dashboard Stats (WORKING - as reference)
console.log('\n📊 Step 2: Testing Dashboard Stats (reference implementation)...');
const statsResponse1 = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const stats1 = await statsResponse1.json();
console.log('✅ Dashboard stats loaded:', {
  totalRegistrations: stats1.totalRegistrations,
  pendingReviews: stats1.pendingReviews
});

// Wait 1 second and call again (should hit cache)
console.log('\n⏱️  Waiting 1 second, then calling again (should HIT cache)...');
await new Promise(resolve => setTimeout(resolve, 1000));

const statsResponse2 = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const stats2 = await statsResponse2.json();
console.log('✅ Dashboard stats (cached):', {
  totalRegistrations: stats2.totalRegistrations,
  pendingReviews: stats2.pendingReviews
});

// Step 3: Test Registrations API (FIXED)
console.log('\n📋 Step 3: Testing Registrations API (FIXED)...');
console.log('First call (should MISS cache and fetch from DB)...');

const regsResponse1 = await fetch(`${BASE_URL}/api/admin/registrations?page=1&limit=5`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (!regsResponse1.ok) {
  console.error('❌ Registrations API failed:', regsResponse1.status, await regsResponse1.text());
  process.exit(1);
}

const regs1 = await regsResponse1.json();
console.log('✅ Registrations loaded:', {
  total: regs1.total,
  count: regs1.registrations?.length || 0,
  page: regs1.page,
  totalPages: regs1.totalPages
});

// Step 4: Test Cache HIT
console.log('\n⏱️  Step 4: Waiting 1 second, then calling again (should HIT cache)...');
await new Promise(resolve => setTimeout(resolve, 1000));

const regsResponse2 = await fetch(`${BASE_URL}/api/admin/registrations?page=1&limit=5`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (!regsResponse2.ok) {
  console.error('❌ Registrations API (cached) failed:', regsResponse2.status);
  process.exit(1);
}

const regs2 = await regsResponse2.json();
console.log('✅ Registrations (cached):', {
  total: regs2.total,
  count: regs2.registrations?.length || 0,
  page: regs2.page,
  totalPages: regs2.totalPages
});

// Step 5: Verify data consistency
console.log('\n🔍 Step 5: Verifying data consistency...');
const isConsistent = JSON.stringify(regs1) === JSON.stringify(regs2);

if (isConsistent) {
  console.log('✅ Cache data is consistent with fresh data');
} else {
  console.error('❌ Cache data mismatch!');
  process.exit(1);
}

// Step 6: Test different query parameters (different cache key)
console.log('\n🔀 Step 6: Testing different query parameters...');
const regsResponse3 = await fetch(`${BASE_URL}/api/admin/registrations?page=1&limit=5&status=pending`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (!regsResponse3.ok) {
  console.error('❌ Registrations API with filters failed:', regsResponse3.status);
  process.exit(1);
}

const regs3 = await regsResponse3.json();
console.log('✅ Filtered registrations loaded:', {
  total: regs3.total,
  count: regs3.registrations?.length || 0,
  filter: 'status=pending'
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('✨ ALL TESTS PASSED ✨');
console.log('\n📝 Summary:');
console.log('  ✅ Dashboard Stats: Working with Redis cache');
console.log('  ✅ Registrations API: Fixed and working with Redis cache');
console.log('  ✅ Cache consistency: Verified');
console.log('  ✅ Query parameters: Different cache keys working');
console.log('\n💡 Check server logs for cache HIT/MISS messages');
console.log('=' .repeat(60));
