import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function setHaimUnverified() {
  try {
    console.log('Setting Haim Derazon to unverified status...');

    const result = await db
      .update(subscribers)
      .set({
        mobileVerified: false,
        status: 'pending',
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      })
      .where(eq(subscribers.email, 'haim.derazon@gmail.com'))
      .returning();

    if (result.length > 0) {
      console.log('✅ Updated successfully:');
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('❌ No user found with that email');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setHaimUnverified();
