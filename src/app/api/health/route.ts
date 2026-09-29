import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Library Management System (LMS)',
    version: '2026.1.0',
    uptime: process.uptime(),
  });
}
