import { getAuthSession } from '@/server/lib/auth-session';
import { apiSuccess, apiError } from '@/server/lib/api-response';

export async function GET() {
  const user = await getAuthSession();
  if (!user) {
    return apiError('UNAUTHENTICATED', 'No active session found', 401);
  }
  return apiSuccess({ user });
}
