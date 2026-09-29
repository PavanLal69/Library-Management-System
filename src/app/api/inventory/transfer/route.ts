import { NextRequest } from 'next/server';
import { z } from 'zod';
import { InventoryService } from '@/server/services/InventoryService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const transferSchema = z.object({
  copyId: z.string().uuid('Valid copy ID required'),
  newShelfId: z.string().uuid('Valid shelf ID required'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.INVENTORY_MANAGE);
    const body = await req.json();
    const validated = transferSchema.parse(body);

    const result = await InventoryService.transferShelf(validated.copyId, validated.newShelfId, session.id);
    return apiSuccess(result, { message: 'Shelf location updated successfully' });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Shelf transfer failed';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('TRANSFER_FAILED', message, status);
  }
}
