import { NextRequest } from 'next/server';
import { ReservationService } from '@/server/services/ReservationService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const cancelled = await ReservationService.cancelReservation(id, session.id);
    return apiSuccess(cancelled, { message: 'Reservation cancelled successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel reservation';
    return apiError('CANCEL_FAILED', message, 400);
  }
}
