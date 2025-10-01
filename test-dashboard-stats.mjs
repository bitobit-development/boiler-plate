#!/usr/bin/env node

const API_BASE_URL = 'http://localhost:3000/api';

async function testDashboardStats() {
  console.log('Testing Dashboard Stats API...\n');
  console.log('==========================================\n');

  try {
    // First, login to get access token
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@biggbuzz.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Login failed: ${error}`);
    }

    const loginData = await loginResponse.json();
    console.log('✓ Login successful\n');

    const accessToken = loginData.tokens?.accessToken || loginData.accessToken;

    // Test dashboard stats endpoint
    console.log('2. Fetching dashboard stats...');
    const statsResponse = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!statsResponse.ok) {
      const error = await statsResponse.text();
      throw new Error(`Failed to fetch stats: ${error}`);
    }

    const stats = await statsResponse.json();
    console.log('✓ Stats fetched successfully\n');

    // Display the stats
    console.log('Dashboard Statistics:');
    console.log('==========================================');
    console.log(`Total Registrations: ${stats.totalRegistrations}`);
    console.log(`Pending Reviews: ${stats.pendingReviews}`);
    console.log(`Approved Today: ${stats.approvedToday}`);
    console.log(`Rejected Today: ${stats.rejectedToday}`);
    console.log(`Average Processing Time: ${stats.averageProcessingTime} seconds`);
    console.log(`Active Admins: ${stats.activeAdmins}`);
    console.log('\nStatus Breakdown:');
    console.log(`  - Pending: ${stats.statusBreakdown.pending}`);
    console.log(`  - Approved: ${stats.statusBreakdown.approved}`);
    console.log(`  - Rejected: ${stats.statusBreakdown.rejected}`);
    console.log('\nRegistration Trend (last 5 days):');
    const lastFiveDays = stats.registrationTrend.slice(-5);
    lastFiveDays.forEach(day => {
      console.log(`  ${day.date}: ${day.count} registrations`);
    });
    console.log('\n==========================================');

    // Verify the structure matches AdminStats interface
    console.log('\nVerifying data structure...');
    const requiredFields = [
      'totalRegistrations',
      'pendingReviews',
      'approvedToday',
      'rejectedToday',
      'averageProcessingTime',
      'activeAdmins',
      'registrationTrend',
      'statusBreakdown'
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (stats[field] === undefined) {
        console.log(`✗ Missing field: ${field}`);
        allFieldsPresent = false;
      } else {
        console.log(`✓ Field present: ${field}`);
      }
    }

    if (allFieldsPresent) {
      console.log('\n✓ All required fields are present');
      console.log('✓ Data structure matches AdminStats interface');
    } else {
      console.log('\n✗ Some required fields are missing');
    }

    // Verify totalRegistrations is 15 (as expected)
    console.log('\n==========================================');
    if (stats.totalRegistrations === 15) {
      console.log('✓ Total Registrations correctly shows 15');
    } else {
      console.log(`⚠ Expected 15 total registrations, got ${stats.totalRegistrations}`);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testDashboardStats().catch(console.error);