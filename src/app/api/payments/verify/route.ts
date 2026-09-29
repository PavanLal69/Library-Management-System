import { NextRequest } from 'next/server';
import { z } from 'zod';
import { PaymentService } from '@/server/services/PaymentService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

const verifySchema = z.object({
  fineId: z.string().uuid('Valid fine ID required'),
  providerName: z.string().min(1, 'Provider name is required'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  signature: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  paymentMethod: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.memberProfile) {
      return apiError('NOT_A_MEMBER', 'No member profile associated with this account', 400);
    }

    const body = await req.json();
    const validated = verifySchema.parse(body);

    const result = await PaymentService.verifyAndSettlePayment({
      fineId: validated.fineId,
      memberId: session.memberProfile.id,
      providerName: validated.providerName,
      transactionId: validated.transactionId,
      signature: validated.signature,
      payload: validated.payload,
      paymentMethod: validated.paymentMethod,
    });

    return apiSuccess(result, { message: 'Payment successfully processed and verified' });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Payment verification failed';
    return apiError('PAYMENT_VERIFY_FAILED', message, 400);
  }
}
