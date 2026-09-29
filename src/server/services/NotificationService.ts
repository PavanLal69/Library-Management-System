import { db, initPromise } from '../db';
import { notifications } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export class NotificationService {
  static async send(params: CreateNotificationParams): Promise<void> {
    try {
      await initPromise;
      await db.insert(notifications).values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        isRead: false,
      });
    } catch (err) {
      console.error('[NotificationService] Failed to insert notification:', err);
    }
  }

  static async getUserNotifications(userId: string, limit = 20) {
    await initPromise;
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  static async markAsRead(notificationId: string, userId: string) {
    await initPromise;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  static async markAllAsRead(userId: string) {
    await initPromise;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }
}
