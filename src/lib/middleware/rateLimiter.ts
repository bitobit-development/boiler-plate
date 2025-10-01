import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { NextRequest, NextResponse } from 'next/server';

// Different rate limiters for different endpoints
const loginLimiter = new RateLimiterMemory({
  keyPrefix: 'login',
  points: 5, // 5 attempts
  duration: 900, // per 15 minutes
  blockDuration: 900, // block for 15 minutes
});

const apiLimiter = new RateLimiterMemory({
  keyPrefix: 'api',
  points: 100, // 100 requests
  duration: 60, // per minute
});

const strictApiLimiter = new RateLimiterMemory({
  keyPrefix: 'strict_api',
  points: 10, // 10 requests
  duration: 60, // per minute
});

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiterType: 'login' | 'api' | 'strict' = 'api'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get client identifier (IP address or user ID)
      const identifier =
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown';

      let limiter: RateLimiterMemory;
      switch (limiterType) {
        case 'login':
          limiter = loginLimiter;
          break;
        case 'strict':
          limiter = strictApiLimiter;
          break;
        default:
          limiter = apiLimiter;
      }

      await limiter.consume(identifier);
      return handler(req);
    } catch (rejRes) {
      const res = rejRes as RateLimiterRes;
      const retryAfter = Math.round(res.msBeforeNext / 1000) || 60;

      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: retryAfter,
          message: `Please try again in ${retryAfter} seconds`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(res.points),
            'X-RateLimit-Remaining': String(res.remainingPoints || 0),
            'X-RateLimit-Reset': new Date(Date.now() + res.msBeforeNext).toISOString(),
          },
        }
      );
    }
  };
}

export function resetRateLimit(identifier: string, limiterType: 'login' | 'api' | 'strict' = 'api') {
  let limiter: RateLimiterMemory;
  switch (limiterType) {
    case 'login':
      limiter = loginLimiter;
      break;
    case 'strict':
      limiter = strictApiLimiter;
      break;
    default:
      limiter = apiLimiter;
  }

  return limiter.delete(identifier);
}