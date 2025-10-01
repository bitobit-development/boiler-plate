import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { Subscriber } from '@/lib/db/models/Subscriber';

export async function GET() {
  try {
    // Test database connection
    await connectToDatabase();

    // Count admin users
    const adminCount = await AdminUser.countDocuments();

    // Count subscribers
    const subscriberCount = await Subscriber.countDocuments();

    // Get first admin user (without password)
    const admins = await AdminUser.find({}, { limit: 1 });
    const firstAdmin = admins[0];

    return NextResponse.json({
      success: true,
      database: 'connected',
      counts: {
        admins: adminCount,
        subscribers: subscriberCount
      },
      sampleAdmin: firstAdmin ? {
        id: firstAdmin.id,
        email: firstAdmin.email,
        username: firstAdmin.username,
        name: `${firstAdmin.firstName} ${firstAdmin.lastName}`,
        role: firstAdmin.role,
        isActive: firstAdmin.isActive
      } : null
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}