import { db, initPromise } from '../db';
import { auditLogs } from '../db/schema';

import { desc } from 'drizzle-orm';

export interface AuditEventParams {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  static async log(event: AuditEventParams): Promise<void> {
    try {
      await initPromise;
      await db.insert(auditLogs).values({
        actorId: event.actorId || null,
        actorRole: event.actorRole || null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        ipAddress: event.ipAddress || null,
        userAgent: event.userAgent || null,
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  static async getLogs(options?: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    await initPromise;
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
    return logs;
  }
}
