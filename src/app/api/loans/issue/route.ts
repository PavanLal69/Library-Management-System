import { NextRequest } from 'next/server';
import { z } from 'zod';
import { LoanService } from '@/server/services/LoanService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const issueLoanSchema = z.object({
  memberId: z.string().uuid('Valid member ID required'),
  copyId: z.string().uuid('Valid copy ID required'),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.BORROW_CREATE);
    const body = await req.json();
    const validated = issueLoanSchema.parse(body);

    const result = await LoanService.issueLoan({
      memberId: validated.memberId,
      copyId: validated.copyId,
      issuedBy: session.id,
      notes: validated.notes,
    });

    return apiSuccess(result, { message: 'Book successfully checked out' }, 201);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Failed to issue loan';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('LOAN_ISSUE_FAILED', message, status);
  }
}
