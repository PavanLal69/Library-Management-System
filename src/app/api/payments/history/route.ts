import { PaymentService } from '@/server/services/PaymentService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

export async function GET() {
  try {
    const session = await requireAuth();
    const isStaffOrAdmin = session.roles.some((r) =>
      ['SUPER_ADMIN', 'LIBRARIAN', 'ASSISTANT_LIBRARIAN'].includes(r)
    );

    if (isStaffOrAdmin) {
      const history = await PaymentService.getPaymentHistory();
      return apiSuccess(history);
    }

    if (!session.memberProfile) {
      return apiError('NOT_A_MEMBER', 'No member profile found', 400);
    }

    const memberHistory = await PaymentService.getPaymentHistory(session.memberProfile.id);
    return apiSuccess(memberHistory);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch payment history';
    return apiError('PAYMENT_HISTORY_FAILED', message, 500);
  }
}
