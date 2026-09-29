import { NextRequest } from 'next/server';
import { AuditService } from '@/server/services/AuditService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(PERMISSIONS.AUDIT_VIEW);
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const logs = await AuditService.getLogs({
      entityType,
      action,
      limit,
    });

    return apiSuccess(logs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return apiError('AUDIT_FETCH_FAILED', message, status);
  }
}
