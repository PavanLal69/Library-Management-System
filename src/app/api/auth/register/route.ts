import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/server/services/AuthService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { AUTH_COOKIE_NAME } from '@/server/lib/auth-session';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  department: z.string().optional(),
  course: z.string().optional(),
  yearOfStudy: z.number().int().min(1).max(10).optional(),
  universityId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    const { user, token } = await AuthService.register(validated);

    const response = apiSuccess(
      { user },
      { message: 'Registration successful. Welcome to the library platform.' },
      201
    );

    // Set secure HTTP-only cookie
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
    const message = err instanceof Error ? err.message : 'Registration failed';
    return apiError('REGISTRATION_FAILED', message, 400);
  }
}
