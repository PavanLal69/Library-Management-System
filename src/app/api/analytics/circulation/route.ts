import { AnalyticsService } from '@/server/services/AnalyticsService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

export async function GET() {
  try {
    await requireAuth(PERMISSIONS.REPORT_VIEW);
    const stats = await AnalyticsService.getCirculationStats();
    return apiSuccess(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch circulation analytics';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return apiError('ANALYTICS_FAILED', message, status);
  }
}
