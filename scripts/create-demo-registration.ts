import { db } from '../src/lib/db';
import { subscribers, auditLogs } from '../src/lib/db/schema';

async function createDemoRegistration() {
  try {
    console.log('Creating demo registration...');

    // Insert demo subscriber
    const [newSubscriber] = await db.insert(subscribers).values({
      name: 'John',
      surname: 'Doe',
      email: `john.doe.${Date.now()}@demo.com`,
      mobile: `+1555${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
      ageVerified: true,
      emailVerified: false,
      mobileVerified: false,
      status: 'pending',
      source: 'website',
      city: 'Toronto',
      region: 'Ontario',
      country: 'CA',
      consentMarketing: true,
      consentDataProcessing: true,
      consentTerms: true,
      customFields: {
        licenseType: 'Retail Cannabis License',
        businessName: 'Green Leaf Dispensary'
      }
    }).returning();

    console.log('✅ Demo subscriber created:', newSubscriber.id);

    // Create audit log for the registration
    await db.insert(auditLogs).values({
      adminUserId: null,
      adminEmail: 'system@biggbuzz.com',
      adminRole: 'system',
      action: 'create',
      entityType: 'registration',
      entityId: newSubscriber.id,
      entityName: `${newSubscriber.name} ${newSubscriber.surname}`,
      description: `New registration: ${newSubscriber.name} ${newSubscriber.surname} registered for ${newSubscriber.customFields?.licenseType || 'Cannabis License'}`,
      metadata: {
        licenseType: newSubscriber.customFields?.licenseType || 'Cannabis License',
        name: `${newSubscriber.name} ${newSubscriber.surname}`,
        email: newSubscriber.email,
        mobile: newSubscriber.mobile,
        city: newSubscriber.city
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Demo Script',
      isSuccess: true
    });

    console.log('✅ Audit log created for registration');
    console.log('\n📋 Demo Registration Details:');
    console.log(`   Name: ${newSubscriber.name} ${newSubscriber.surname}`);
    console.log(`   Email: ${newSubscriber.email}`);
    console.log(`   Mobile: ${newSubscriber.mobile}`);
    console.log(`   License Type: ${newSubscriber.customFields?.licenseType}`);
    console.log(`   Status: ${newSubscriber.status}`);
    console.log(`   City: ${newSubscriber.city}, ${newSubscriber.region}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo registration:', error);
    process.exit(1);
  }
}

createDemoRegistration();
