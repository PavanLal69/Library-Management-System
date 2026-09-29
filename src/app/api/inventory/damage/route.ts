import { NextRequest } from 'next/server';
import { z } from 'zod';
import { InventoryService } from '@/server/services/InventoryService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const damageSchema = z.object({
  copyId: z.string().uuid('Valid copy ID required'),
  status: z.enum(['DAMAGED', 'LOST']),
  notes: z.string().min(3, 'Detailed inspection notes required'),
  chargeFee: z.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.INVENTORY_MANAGE);
    const body = await req.json();
    const validated = damageSchema.parse(body);

    const result = await InventoryService.reportDamageOrLoss({
      ...validated,
      actorId: session.id,
    });

    return apiSuccess(result, { message: `Physical copy status marked as ${validated.status}` });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Action failed';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('DAMAGE_REPORT_FAILED', message, status);
  }
}
