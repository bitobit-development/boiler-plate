import { db } from '../src/lib/db';
import { subscribers, otpOverrideLogs } from '../src/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

async function verifyOverride() {
  try {
    // Check Haim's current status
    const [customer] = await db
      .select()
      .from(subscribers)
      .where(
        and(
          eq(subscribers.name, 'Haim'),
          eq(subscribers.surname, 'Derazon')
        )
      );

    console.log('✅ Customer Status:');
    console.log({
      name: customer.name,
      surname: customer.surname,
      email: customer.email,
      mobile: customer.mobile,
      status: customer.status,
      mobileVerified: customer.mobileVerified,
      verifiedAt: customer.verifiedAt
    });

    // Check override log
    const [override] = await db
      .select()
      .from(otpOverrideLogs)
      .where(eq(otpOverrideLogs.subscriberId, customer.id))
      .orderBy(desc(otpOverrideLogs.createdAt))
      .limit(1);

    if (override) {
      console.log('\n✅ Override Log Entry:');
      console.log({
        id: override.id,
        subscriberId: override.subscriberId,
        shopUserId: override.shopUserId,
        reason: override.reason,
        explanation: override.explanation,
        wasSuccessful: override.wasSuccessful,
        riskScore: override.riskScore,
        flaggedForReview: override.flaggedForReview,
        createdAt: override.createdAt
      });
    } else {
      console.log('\n❌ No override log found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

verifyOverride();
