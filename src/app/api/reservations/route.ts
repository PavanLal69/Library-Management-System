import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ReservationService } from '@/server/services/ReservationService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

const createReservationSchema = z.object({
  bookId: z.string().uuid('Valid book ID required'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.memberProfile) {
      return apiError('NOT_A_MEMBER', 'Only registered library members can reserve books', 400);
    }

    const body = await req.json();
    const validated = createReservationSchema.parse(body);

    const reservation = await ReservationService.createReservation({
      memberId: session.memberProfile.id,
      bookId: validated.bookId,
      actorId: session.id,
    });

    return apiSuccess(reservation, { message: 'Book successfully reserved' }, 201);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Reservation failed';
    const status = message.includes('UNAUTHORIZED') ? 401 : 400;
    return apiError('RESERVATION_FAILED', message, status);
  }
}

export async function GET() {
  try {
    const session = await requireAuth();
    const isStaffOrAdmin = session.roles.some((r) =>
      ['SUPER_ADMIN', 'LIBRARIAN', 'ASSISTANT_LIBRARIAN'].includes(r)
    );

    if (isStaffOrAdmin) {
      const allActive = await ReservationService.getAllActiveReservations();
      return apiSuccess(allActive);
    }

    if (!session.memberProfile) {
      return apiError('NOT_A_MEMBER', 'User has no member profile', 400);
    }

    const memberReservations = await ReservationService.getMemberReservations(session.memberProfile.id);
    return apiSuccess(memberReservations);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch reservations';
    return apiError('FETCH_FAILED', message, 500);
  }
}
