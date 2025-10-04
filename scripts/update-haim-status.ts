import { db } from '../src/lib/db';
import { subscribers } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function updateHaimStatus() {
  try {
    console.log('Updating Haim Derazon status to pending...');

    const [updated] = await db
      .update(subscribers)
      .set({
        status: 'pending',
        mobileVerified: false,
        verifiedAt: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(subscribers.name, 'Haim'),
          eq(subscribers.surname, 'Derazon')
        )
      )
      .returning();

    if (updated) {
      console.log('✅ Successfully updated Haim Derazon:');
      console.log({
        name: updated.name,
        surname: updated.surname,
        email: updated.email,
        mobile: updated.mobile,
        status: updated.status,
        mobileVerified: updated.mobileVerified,
        verifiedAt: updated.verifiedAt
      });
    } else {
      console.log('❌ Customer not found');
    }
  } catch (error) {
    console.error('Error updating customer:', error);
  } finally {
    process.exit(0);
  }
}

updateHaimStatus();
