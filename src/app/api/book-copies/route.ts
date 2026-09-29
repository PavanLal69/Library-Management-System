import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BookCopyService } from '@/server/services/BookCopyService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const createCopySchema = z.object({
  bookId: z.string().uuid('Valid book ID required'),
  barcode: z.string().optional(),
  accessionNumber: z.string().optional(),
  shelfId: z.string().uuid().nullable().optional(),
  condition: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.INVENTORY_MANAGE);
    const body = await req.json();
    const validated = createCopySchema.parse(body);

    const copy = await BookCopyService.createCopy({
      ...validated,
      actorId: session.id,
    });

    return apiSuccess(copy, { message: 'Physical book copy added successfully' }, 201);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Failed to add copy';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('COPY_CREATE_FAILED', message, status);
  }
}
