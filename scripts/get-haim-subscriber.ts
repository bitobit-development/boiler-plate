import { db } from '../src/lib/db';
import { subscribers } from '../src/lib/db/schema';
import { like, or } from 'drizzle-orm';

async function getHaimSubscriber() {
  try {
    // Search for Haim Derazon or any +972 number
    const results = await db
      .select()
      .from(subscribers)
      .where(
        or(
          like(subscribers.name, '%Haim%'),
          like(subscribers.phoneNumber, '%972%')
        )
      )
      .limit(10);

    console.log('\n=== Haim\'s Subscriber Account(s) ===\n');

    if (results.length === 0) {
      console.log('No subscribers found matching "Haim" or +972 numbers');
      return;
    }

    results.forEach((sub, index) => {
      console.log(`\n--- Subscriber ${index + 1} ---`);
      console.log(`ID: ${sub.id}`);
      console.log(`Name: ${sub.name}`);
      console.log(`Phone: ${sub.phoneNumber}`);
      console.log(`Email: ${sub.email || 'N/A'}`);
      console.log(`Status: ${sub.status}`);
      console.log(`Created: ${sub.createdAt}`);
    });

    console.log('\n');
  } catch (error) {
    console.error('Error fetching subscriber:', error);
  } finally {
    process.exit(0);
  }
}

getHaimSubscriber();
