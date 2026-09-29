import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FineService } from '@/server/services/FineService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const waiveSchema = z.object({
  reason: z.string().min(5, 'A detailed waiver reason is required (at least 5 characters)'),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(PERMISSIONS.FINE_WAIVE);
    const { id } = await params;
    const body = await req.json();
    const validated = waiveSchema.parse(body);

    const waived = await FineService.waiveFine(id, session.id, validated.reason);
    return apiSuccess(waived, { message: 'Fine waived successfully' });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Failed to waive fine';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('FINE_WAIVE_FAILED', message, status);
  }
}
