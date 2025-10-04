import { db } from '../src/lib/db';
import { adminUsers } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getShopUserId() {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, 'foodtruck@biggbuzz.com'))
    .limit(1);

  if (user) {
    console.log('Shop User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
  } else {
    console.log('Shop user not found');
  }

  process.exit(0);
}

getShopUserId();
