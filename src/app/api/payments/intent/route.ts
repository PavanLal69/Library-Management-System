import { NextRequest } from 'next/server';
import { z } from 'zod';
import { PaymentService } from '@/server/services/PaymentService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

const intentSchema = z.object({
  fineId: z.string().uuid('Valid fine ID required'),
  providerName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.memberProfile) {
      return apiError('NOT_A_MEMBER', 'No member profile associated with this account', 400);
    }

    const body = await req.json();
    const validated = intentSchema.parse(body);

    const intent = await PaymentService.createIntent({
      fineId: validated.fineId,
      memberId: session.memberProfile.id,
      providerName: validated.providerName,
    });

    return apiSuccess(intent);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Failed to create payment intent';
    return apiError('INTENT_FAILED', message, 400);
  }
}
