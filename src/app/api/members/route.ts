import { NextRequest } from 'next/server';
import { MemberService } from '@/server/services/MemberService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(PERMISSIONS.MEMBER_VIEW);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || undefined;

    const members = await MemberService.searchMembers(query);
    return apiSuccess(members);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to search members';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return apiError('MEMBERS_FETCH_FAILED', message, status);
  }
}
