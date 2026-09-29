import { NextRequest } from 'next/server';
import { FineService } from '@/server/services/FineService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session.memberProfile) {
      return apiError('NOT_A_MEMBER', 'No member profile found', 400);
    }

    const fines = await FineService.getMemberFines(session.memberProfile.id);
    return apiSuccess(fines);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch fines';
    return apiError('FINES_FETCH_FAILED', message, 500);
  }
}
