import { cookies, headers } from 'next/headers';
import { AuthService, UserContext } from '../services/AuthService';
import { PermissionCode, hasPermission } from './rbac';

export const AUTH_COOKIE_NAME = 'lms_auth_token';

export async function getAuthSession(): Promise<UserContext | null> {
  let token: string | undefined;

  // Check header first
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Fallback to cookie
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  }

  if (!token) return null;

  return AuthService.validateSessionToken(token);
}

export async function requireAuth(requiredPermission?: PermissionCode): Promise<UserContext> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error('UNAUTHORIZED: Authentication required.');
  }

  if (requiredPermission) {
    const permitted = hasPermission(session.roles, requiredPermission);
    if (!permitted) {
      throw new Error(`FORBIDDEN: Missing required permission [${requiredPermission}].`);
    }
  }

  return session;
}
