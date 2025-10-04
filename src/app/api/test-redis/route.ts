import { NextResponse } from 'next/server';
import { cacheExists, setCached, getCached } from '@/lib/cache';

export async function GET() {
  try {
    // Test Redis by setting and getting a test value
    const testKey = 'test:redis:connection';
    const testValue = { timestamp: Date.now(), test: true };

    await setCached(testKey, testValue, 10); // 10 second TTL
    const retrieved = await getCached(testKey);
    const exists = await cacheExists(testKey);

    if (retrieved && exists) {
      return NextResponse.json({
        success: true,
        message: '✅ Redis connected successfully!',
        upstash: true,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '⚠️ Redis not available',
        upstash: false,
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `❌ Redis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      upstash: false,
    }, { status: 500 });
  }
}
