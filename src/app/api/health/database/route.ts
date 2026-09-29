import { NextResponse } from 'next/server';
import { db, initPromise } from '@/server/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  const start = Date.now();
  try {
    await initPromise;
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;

    return NextResponse.json({
      status: 'UP',
      component: 'PostgreSQL Database',
      latencyMs: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: 'DOWN',
        component: 'PostgreSQL Database',
        error: err instanceof Error ? err.message : 'Database check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
