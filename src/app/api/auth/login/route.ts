import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/server/services/AuthService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { AUTH_COOKIE_NAME } from '@/server/lib/auth-session';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const { user, token } = await AuthService.login(validated.email, validated.password, {
      ipAddress,
      userAgent,
    });

    const response = apiSuccess(
      { user, token },
      { message: 'Authentication successful' },
      200
    );

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input data', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Login failed';
    return apiError('AUTH_FAILED', message, 401);
  }
}
