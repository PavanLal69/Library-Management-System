import { NextRequest } from 'next/server';
import { MemberService } from '@/server/services/MemberService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ cardNumber: string }> }) {
  try {
    await requireAuth(PERMISSIONS.MEMBER_VIEW);
    const { cardNumber } = await params;

    const member = await MemberService.getMemberByCardNumber(cardNumber);
    if (!member) {
      return apiError('MEMBER_NOT_FOUND', `No library member found with card number "${cardNumber}"`, 404);
    }

    return apiSuccess(member);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to lookup member card';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return apiError('MEMBER_LOOKUP_FAILED', message, status);
  }
}
