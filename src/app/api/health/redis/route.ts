import { NextResponse } from 'next/server';

export async function GET() {
  const hasRedis = Boolean(process.env.REDIS_URL);

  return NextResponse.json({
    status: 'UP',
    component: 'Cache & Queue Engine',
    adapter: hasRedis ? 'Redis Cluster' : 'In-Memory Sliding-Window Engine',
    redisConfigured: hasRedis,
    timestamp: new Date().toISOString(),
  });
}
