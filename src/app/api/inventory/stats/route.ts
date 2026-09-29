import { InventoryService } from '@/server/services/InventoryService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

export async function GET() {
  try {
    await requireAuth(PERMISSIONS.INVENTORY_MANAGE);
    const stats = await InventoryService.getStats();
    return apiSuccess(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch inventory stats';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return apiError('INVENTORY_STATS_FAILED', message, status);
  }
}
