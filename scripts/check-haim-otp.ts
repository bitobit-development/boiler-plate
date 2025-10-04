import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkHaimOTP() {
  try {
    const result = await db
      .select({
        email: subscribers.email,
        mobile: subscribers.mobile,
        otpCode: subscribers.otpCode,
        otpExpiresAt: subscribers.otpExpiresAt,
        otpAttempts: subscribers.otpAttempts,
        mobileVerified: subscribers.mobileVerified,
        status: subscribers.status,
      })
      .from(subscribers)
      .where(eq(subscribers.email, 'haim.derazon@gmail.com'));

    if (result.length > 0) {
      console.log('📱 Haim Derazon OTP Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Mobile: ${result[0].mobile}`);
      console.log(`OTP Code: ${result[0].otpCode || 'Not generated'}`);
      console.log(`Expires At: ${result[0].otpExpiresAt || 'N/A'}`);
      console.log(`Attempts: ${result[0].otpAttempts}`);
      console.log(`Mobile Verified: ${result[0].mobileVerified}`);
      console.log(`Status: ${result[0].status}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('❌ No user found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkHaimOTP();
