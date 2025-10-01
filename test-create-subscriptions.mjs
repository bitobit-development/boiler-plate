#!/usr/bin/env node

/**
 * Test Script: Create 5 Test Subscriptions
 * This script creates 5 realistic test subscriptions via the subscription API
 * to verify the admin dashboard updates correctly.
 */

const API_URL = 'http://localhost:3000/api/subscribe';

// Realistic test data for 5 different subscribers
const testSubscribers = [
  {
    name: 'John',
    surname: 'Smith',
    email: 'john.smith@example.com',
    mobile: '+1-555-0101',
    ageVerified: true,
    source: 'website',
    country: 'US',
    campaign: 'launch-2025',
    consentMarketing: true
  },
  {
    name: 'Sarah',
    surname: 'Johnson',
    email: 'sarah.johnson@example.com',
    mobile: '+1-555-0102',
    ageVerified: true,
    source: 'social',
    country: 'CA',
    campaign: 'instagram-promo',
    consentMarketing: true
  },
  {
    name: 'Michael',
    surname: 'Brown',
    email: 'michael.brown@example.com',
    mobile: '+44-7700-900103',
    ageVerified: true,
    source: 'referral',
    country: 'UK',
    campaign: 'friend-referral',
    consentMarketing: false
  },
  {
    name: 'Emma',
    surname: 'Davis',
    email: 'emma.davis@example.com',
    mobile: '+1-555-0104',
    ageVerified: true,
    source: 'website',
    country: 'US',
    campaign: 'google-ads',
    consentMarketing: true
  },
  {
    name: 'David',
    surname: 'Wilson',
    email: 'david.wilson@example.com',
    mobile: '+1-416-555-0105',
    ageVerified: true,
    source: 'event',
    country: 'CA',
    campaign: 'toronto-expo-2025',
    consentMarketing: true
  }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Track results
const results = {
  successful: [],
  failed: [],
  errors: []
};

// Function to create a single subscription
async function createSubscription(subscriber, index) {
  console.log(`${colors.cyan}[${index + 1}/5]${colors.reset} Creating subscription for ${subscriber.name} ${subscriber.surname}...`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriber)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✓${colors.reset} Successfully created subscription for ${subscriber.name} ${subscriber.surname}`);
      console.log(`  ID: ${data.subscriber?.id}`);
      console.log(`  Email: ${data.subscriber?.email}`);
      console.log(`  Status: ${data.subscriber?.status}`);
      console.log(`  Source: ${subscriber.source}`);
      console.log(`  Country: ${subscriber.country}`);

      results.successful.push({
        ...subscriber,
        id: data.subscriber?.id
      });
    } else {
      console.log(`${colors.red}✗${colors.reset} Failed to create subscription for ${subscriber.name} ${subscriber.surname}`);
      console.log(`  Error: ${data.error || 'Unknown error'}`);
      if (data.details) {
        console.log(`  Details: ${data.details}`);
      }

      results.failed.push({
        ...subscriber,
        error: data.error || 'Unknown error'
      });
    }

    return data;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Error creating subscription for ${subscriber.name} ${subscriber.surname}`);
    console.log(`  Error: ${error.message}`);

    results.errors.push({
      ...subscriber,
      error: error.message
    });

    return null;
  }
}

// Main execution
async function main() {
  console.log(`${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.yellow}Creating 5 Test Subscriptions${colors.reset}`);
  console.log(`${colors.yellow}========================================${colors.reset}\n`);

  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3000/api/subscribe', {
      method: 'GET'
    }).catch(() => null);

    if (!healthCheck) {
      console.log(`${colors.red}Error: Cannot connect to localhost:3000${colors.reset}`);
      console.log('Please ensure the Next.js development server is running: npm run dev');
      process.exit(1);
    }
  } catch (error) {
    // GET is not implemented, but if we get a response, the server is running
  }

  // Create subscriptions sequentially to avoid overwhelming the server
  for (let i = 0; i < testSubscribers.length; i++) {
    await createSubscription(testSubscribers[i], i);
    console.log(''); // Add blank line between subscriptions
  }

  // Print summary
  console.log(`${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.yellow}Summary${colors.reset}`);
  console.log(`${colors.yellow}========================================${colors.reset}\n`);

  console.log(`${colors.green}✓ Successful:${colors.reset} ${results.successful.length}`);
  if (results.successful.length > 0) {
    console.log('  Created IDs:');
    results.successful.forEach(sub => {
      console.log(`    - ${sub.id} (${sub.name} ${sub.surname})`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n${colors.red}✗ Failed:${colors.reset} ${results.failed.length}`);
    results.failed.forEach(sub => {
      console.log(`    - ${sub.name} ${sub.surname}: ${sub.error}`);
    });
  }

  if (results.errors.length > 0) {
    console.log(`\n${colors.red}✗ Errors:${colors.reset} ${results.errors.length}`);
    results.errors.forEach(sub => {
      console.log(`    - ${sub.name} ${sub.surname}: ${sub.error}`);
    });
  }

  console.log(`\n${colors.cyan}Test Data Distribution:${colors.reset}`);
  console.log('  Sources: website (2), social (1), referral (1), event (1)');
  console.log('  Countries: US (2), CA (2), UK (1)');
  console.log('  Marketing Consent: Yes (4), No (1)');

  console.log(`\n${colors.yellow}========================================${colors.reset}`);
  console.log('Test complete! Check your admin dashboard to verify the new registrations.');
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
});