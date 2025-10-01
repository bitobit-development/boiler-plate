#!/usr/bin/env node

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { max: 1, prepare: false });

async function checkSubscribers() {
  try {
    // Count total subscribers
    const countResult = await client`
      SELECT COUNT(*) as total FROM subscribers
    `;
    const totalCount = parseInt(countResult[0].total);

    console.log('\n========================================');
    console.log('SUBSCRIPTION DATABASE CHECK');
    console.log('========================================\n');
    console.log(`Total Subscribers: ${totalCount}`);

    // Count by status
    const statusCounts = await client`
      SELECT status, COUNT(*) as count
      FROM subscribers
      GROUP BY status
      ORDER BY count DESC
    `;

    console.log('\nBreakdown by Status:');
    statusCounts.forEach(row => {
      console.log(`  - ${row.status}: ${row.count}`);
    });

    // Count by source
    const sourceCounts = await client`
      SELECT source, COUNT(*) as count
      FROM subscribers
      WHERE source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
    `;

    if (sourceCounts.length > 0) {
      console.log('\nBreakdown by Source:');
      sourceCounts.forEach(row => {
        console.log(`  - ${row.source}: ${row.count}`);
      });
    }

    // Count by country
    const countryCounts = await client`
      SELECT country, COUNT(*) as count
      FROM subscribers
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
    `;

    if (countryCounts.length > 0) {
      console.log('\nBreakdown by Country:');
      countryCounts.forEach(row => {
        console.log(`  - ${row.country}: ${row.count}`);
      });
    }

    // Get last 5 subscribers
    const recentSubscribers = await client`
      SELECT id, name, surname, email, source, country, created_at
      FROM subscribers
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('\n========================================');
    console.log('LAST 5 REGISTRATIONS');
    console.log('========================================\n');

    recentSubscribers.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.name} ${sub.surname}`);
      console.log(`   Email: ${sub.email}`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   Source: ${sub.source || 'website'}`);
      console.log(`   Country: ${sub.country || 'N/A'}`);
      console.log(`   Created: ${sub.created_at.toISOString()}`);
      console.log('');
    });

    // Check for test emails we just created
    const testEmails = [
      'john.smith@example.com',
      'sarah.j.2025@example.com',
      'michael.brown@example.com',
      'emma.davis@example.com',
      'david.wilson@example.com'
    ];

    const testSubscribers = await client`
      SELECT id, name, surname, email
      FROM subscribers
      WHERE email = ANY(${testEmails})
    `;

    console.log('========================================');
    console.log('TEST SUBSCRIPTIONS CREATED');
    console.log('========================================\n');
    console.log(`Found ${testSubscribers.length} of 5 test subscriptions:`);

    testSubscribers.forEach(sub => {
      console.log(`  ✓ ${sub.name} ${sub.surname} (${sub.email})`);
      console.log(`    ID: ${sub.id}`);
    });

    if (testSubscribers.length < 5) {
      console.log('\nMissing test emails:');
      const foundEmails = testSubscribers.map(s => s.email);
      testEmails.forEach(email => {
        if (!foundEmails.includes(email)) {
          console.log(`  ✗ ${email}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSubscribers();