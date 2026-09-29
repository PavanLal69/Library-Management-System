import { NextRequest } from 'next/server';
import { NotificationService } from '@/server/services/NotificationService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await NotificationService.getUserNotifications(session.id);
    return apiSuccess(notifications);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
    const status = message.includes('UNAUTHORIZED') ? 401 : 500;
    return apiError('NOTIFICATIONS_FETCH_FAILED', message, status);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    if (body.all === true) {
      await NotificationService.markAllAsRead(session.id);
      return apiSuccess({ success: true }, { message: 'All notifications marked as read' });
    }

    if (body.notificationId) {
      await NotificationService.markAsRead(body.notificationId, session.id);
      return apiSuccess({ success: true });
    }

    return apiError('INVALID_REQUEST', 'Missing notificationId or all flag', 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update notification';
    const status = message.includes('UNAUTHORIZED') ? 401 : 400;
    return apiError('UPDATE_FAILED', message, status);
  }
}
