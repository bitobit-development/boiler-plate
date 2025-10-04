import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptData } from '@/lib/db/security';

async function getHaimOTPCode() {
  try {
    const result = await db
      .select({
        email: subscribers.email,
        mobile: subscribers.mobile,
        otpCode: subscribers.otpCode,
        otpExpiresAt: subscribers.otpExpiresAt,
        mobileVerified: subscribers.mobileVerified,
      })
      .from(subscribers)
      .where(eq(subscribers.email, 'haim.derazon@gmail.com'));

    if (result.length === 0) {
      console.log('❌ No user found');
      process.exit(1);
    }

    const user = result[0];

    if (!user.otpCode) {
      console.log('❌ No OTP code generated yet');
      process.exit(1);
    }

    // Decrypt the OTP code
    const actualOTPCode = decryptData(user.otpCode);

    console.log('📱 Haim Derazon OTP Code');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Mobile: ${user.mobile}`);
    console.log(`🔐 OTP CODE: ${actualOTPCode}`);
    console.log(`Expires At: ${user.otpExpiresAt}`);
    console.log(`Mobile Verified: ${user.mobileVerified}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Use this code to verify in the POS interface');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getHaimOTPCode();
