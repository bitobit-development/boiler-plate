#!/usr/bin/env node

/**
 * Test Script: Count Total Subscribers
 * This script directly queries the database to count all subscribers
 */

import { connectToDatabase } from './src/lib/db/connection.js';
import { Subscriber } from './src/lib/db/models/Subscriber.js';

async function countSubscribers() {
  try {
    // Connect to database
    await connectToDatabase();

    // Get total count
    const totalCount = await Subscriber.countDocuments({});
    console.log(`\nTotal Subscribers in Database: ${totalCount}`);

    // Get count by status
    const pendingCount = await Subscriber.countDocuments({ status: 'pending' });
    const activeCount = await Subscriber.countDocuments({ status: 'active' });

    console.log(`  - Pending: ${pendingCount}`);
    console.log(`  - Active: ${activeCount}`);

    // Get recent 5 subscribers
    const recentSubscribers = await Subscriber.find({});
    const lastFive = recentSubscribers.slice(-5);

    console.log('\nLast 5 Subscribers Created:');
    lastFive.forEach(sub => {
      console.log(`  - ${sub.name} ${sub.surname} (${sub.email})`);
      console.log(`    ID: ${sub.id}`);
      console.log(`    Source: ${sub.source || 'website'}`);
      console.log(`    Country: ${sub.country || 'N/A'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

countSubscribers();