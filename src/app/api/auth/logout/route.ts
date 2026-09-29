import { cookies } from 'next/headers';
import { AuthService } from '@/server/services/AuthService';
import { apiSuccess } from '@/server/lib/api-response';
import { AUTH_COOKIE_NAME } from '@/server/lib/auth-session';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    await AuthService.logout(token);
  }

  const response = apiSuccess({ loggedOut: true }, { message: 'Logged out successfully' });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
