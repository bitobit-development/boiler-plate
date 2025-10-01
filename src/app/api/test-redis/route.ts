import { NextResponse } from 'next/server';
import { isRedisAvailable } from '@/lib/cache';

export async function GET() {
  try {
    const available = await isRedisAvailable();

    if (available) {
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
