import { NextResponse } from 'next/server';
import { getGrandCouleeStatus } from '@/lib/status';

export const revalidate = 600;

export async function GET() {
  try {
    const status = await getGrandCouleeStatus();
    return NextResponse.json(status, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'LIVE_OPERATIONS_TEMPORARILY_UNAVAILABLE',
      detail: error instanceof Error ? error.message : 'Unknown upstream failure'
    }, { status: 503 });
  }
}
