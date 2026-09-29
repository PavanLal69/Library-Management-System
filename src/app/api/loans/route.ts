import { NextRequest } from 'next/server';
import { LoanService } from '@/server/services/LoanService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    // If member, return their own loans
    const isStaffOrAdmin = session.roles.some((r) =>
      ['SUPER_ADMIN', 'LIBRARIAN', 'ASSISTANT_LIBRARIAN', 'STAFF'].includes(r)
    );

    if (!isStaffOrAdmin) {
      if (!session.memberProfile) {
        return apiError('NOT_A_MEMBER', 'User has no member profile', 400);
      }
      const memberLoans = await LoanService.getMemberLoans(session.memberProfile.id);
      return apiSuccess(memberLoans);
    }

    // Staff/Admin can view all loans
    const allLoans = await LoanService.getAllLoans(status);
    return apiSuccess(allLoans);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch loans';
    const status = message.includes('UNAUTHORIZED') ? 401 : 500;
    return apiError('LOANS_FETCH_FAILED', message, status);
  }
}
