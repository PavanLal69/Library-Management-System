import { NextRequest } from 'next/server';
import { z } from 'zod';
import { LoanService } from '@/server/services/LoanService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const renewSchema = z.object({
  loanId: z.string().uuid('Valid loan ID required'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.BORROW_RENEW);
    const body = await req.json();
    const validated = renewSchema.parse(body);

    const renewed = await LoanService.renewLoan(validated.loanId, session.id);
    return apiSuccess(renewed, { message: 'Loan successfully renewed' });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Renewal failed';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('RENEWAL_FAILED', message, status);
  }
}
