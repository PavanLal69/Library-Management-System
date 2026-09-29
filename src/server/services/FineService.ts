import { db, initPromise } from '../db';
import { fines, loans, members, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { LibrarySettingsService } from './LibrarySettingsService';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';

export class FineService {
  static async calculateOverdueFine(
    dueAt: Date,
    returnedAt: Date = new Date()
  ): Promise<{ overdueDays: number; fineAmount: number }> {
    const diffMs = returnedAt.getTime() - dueAt.getTime();
    if (diffMs <= 0) {
      return { overdueDays: 0, fineAmount: 0 };
    }

    const gracePeriodDays = await LibrarySettingsService.getNumberSetting('GRACE_PERIOD_DAYS', 1);
    const dailyRate = await LibrarySettingsService.getNumberSetting('DAILY_FINE_RATE', 0.5);
    const maxFine = await LibrarySettingsService.getNumberSetting('MAX_OVERDUE_FINE', 25.0);

    const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (overdueDays <= gracePeriodDays) {
      return { overdueDays, fineAmount: 0 };
    }

    const billableDays = overdueDays - gracePeriodDays;
    const computedFine = Math.min(billableDays * dailyRate, maxFine);

    return {
      overdueDays,
      fineAmount: Number(computedFine.toFixed(2)),
    };
  }

  static async createFine(params: {
    memberId: string;
    loanId?: string;
    type: 'OVERDUE' | 'LOST_BOOK' | 'DAMAGED_BOOK' | 'MANUAL';
    amount: number;
    reason: string;
    actorId?: string;
  }) {
    await initPromise;
    const [created] = await db
      .insert(fines)
      .values({
        memberId: params.memberId,
        loanId: params.loanId || null,
        type: params.type,
        amount: params.amount.toFixed(2),
        paidAmount: '0.00',
        currency: 'USD',
        status: 'PENDING',
        reason: params.reason,
      })
      .returning();

    // Get member user id for notification
    const [member] = await db.select().from(members).where(eq(members.id, params.memberId)).limit(1);
    if (member) {
      await NotificationService.send({
        userId: member.userId,
        type: 'FINE_CREATED',
        title: 'New Library Fine Assessed',
        message: `A fine of $${params.amount.toFixed(2)} has been charged to your account (${params.reason}).`,
        link: '/member/fines',
      });
    }

    await AuditService.log({
      actorId: params.actorId,
      action: 'FINE_CREATE',
      entityType: 'FINE',
      entityId: created.id,
      metadata: { memberId: params.memberId, amount: params.amount, type: params.type },
    });

    return created;
  }

  static async waiveFine(fineId: string, waivedBy: string, waiveReason: string) {
    await initPromise;
    const [existing] = await db.select().from(fines).where(eq(fines.id, fineId)).limit(1);
    if (!existing) {
      throw new Error('Fine not found');
    }
    if (existing.status === 'PAID') {
      throw new Error('Cannot waive an already paid fine');
    }

    const [updated] = await db
      .update(fines)
      .set({
        status: 'WAIVED',
        waivedBy,
        waivedAt: new Date(),
        waiveReason,
        updatedAt: new Date(),
      })
      .where(eq(fines.id, fineId))
      .returning();

    await AuditService.log({
      actorId: waivedBy,
      action: 'FINE_WAIVE',
      entityType: 'FINE',
      entityId: fineId,
      metadata: { originalAmount: existing.amount, reason: waiveReason },
    });

    return updated;
  }

  static async getMemberFines(memberId: string) {
    await initPromise;
    return db.select().from(fines).where(eq(fines.memberId, memberId)).orderBy(desc(fines.createdAt));
  }

  static async getOutstandingFineTotal(memberId: string): Promise<number> {
    await initPromise;
    const rows = await db
      .select()
      .from(fines)
      .where(and(eq(fines.memberId, memberId), eq(fines.status, 'PENDING')));

    return rows.reduce((sum, f) => sum + parseFloat(f.amount) - parseFloat(f.paidAmount), 0);
  }
}
