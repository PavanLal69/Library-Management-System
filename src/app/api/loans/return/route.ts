import { NextRequest } from 'next/server';
import { z } from 'zod';
import { LoanService } from '@/server/services/LoanService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const returnLoanSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  condition: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.BORROW_RETURN);
    const body = await req.json();
    const validated = returnLoanSchema.parse(body);

    const result = await LoanService.returnLoan({
      barcode: validated.barcode,
      returnedBy: session.id,
      condition: validated.condition,
      notes: validated.notes,
    });

    return apiSuccess(result, {
      message: result.fine
        ? `Book returned. Overdue fine assessed: $${result.fine.amount}`
        : 'Book returned successfully',
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Failed to return book';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('LOAN_RETURN_FAILED', message, status);
  }
}
