import { db, initPromise } from '../db';
import { reservations, books, bookCopies, members, users } from '../db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { NotificationService } from './NotificationService';
import { AuditService } from './AuditService';
import { LibrarySettingsService } from './LibrarySettingsService';

export class ReservationService {
  static async createReservation(params: { memberId: string; bookId: string; actorId?: string }) {
    await initPromise;

    // Check member
    const [member] = await db.select().from(members).where(eq(members.id, params.memberId)).limit(1);
    if (!member) throw new Error('Member not found');
    if (member.membershipStatus !== 'ACTIVE') {
      throw new Error(`Member account is ${member.membershipStatus}. Cannot reserve books.`);
    }

    // Check existing reservation
    const existing = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.memberId, params.memberId),
          eq(reservations.bookId, params.bookId),
          sql`${reservations.status} IN ('PENDING', 'AVAILABLE_FOR_PICKUP')`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error('You already have an active reservation for this book.');
    }

    // Calculate queue position
    const activeQueue = await db
      .select({ queuePosition: reservations.queuePosition })
      .from(reservations)
      .where(
        and(
          eq(reservations.bookId, params.bookId),
          sql`${reservations.status} IN ('PENDING', 'AVAILABLE_FOR_PICKUP')`
        )
      )
      .orderBy(desc(reservations.queuePosition))
      .limit(1);

    const nextPosition = activeQueue.length > 0 ? activeQueue[0].queuePosition + 1 : 1;

    const [created] = await db
      .insert(reservations)
      .values({
        memberId: params.memberId,
        bookId: params.bookId,
        queuePosition: nextPosition,
        status: 'PENDING',
      })
      .returning();

    // Notify member
    const [book] = await db.select().from(books).where(eq(books.id, params.bookId)).limit(1);
    await NotificationService.send({
      userId: member.userId,
      type: 'RESERVATION_CREATED',
      title: 'Book Reserved',
      message: `You are in waitlist position #${nextPosition} for "${book ? book.title : 'Book'}".`,
      link: '/member/reservations',
    });

    await AuditService.log({
      actorId: params.actorId || member.userId,
      action: 'RESERVATION_CREATE',
      entityType: 'RESERVATION',
      entityId: created.id,
      metadata: { bookId: params.bookId, position: nextPosition },
    });

    return created;
  }

  static async cancelReservation(reservationId: string, actorId: string) {
    await initPromise;
    const [existing] = await db.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1);
    if (!existing) throw new Error('Reservation not found');

    const [cancelled] = await db
      .update(reservations)
      .set({
        status: 'CANCELLED',
        cancelledAt: new Date(),
      })
      .where(eq(reservations.id, reservationId))
      .returning();

    // If an assigned copy was reserved, free it back to AVAILABLE or assign to next
    if (existing.assignedCopyId) {
      await this.assignCopyOnReturn(existing.assignedCopyId, existing.bookId);
    }

    await AuditService.log({
      actorId,
      action: 'RESERVATION_CANCEL',
      entityType: 'RESERVATION',
      entityId: reservationId,
      metadata: { bookId: existing.bookId },
    });

    return cancelled;
  }

  static async assignCopyOnReturn(copyId: string, bookId: string): Promise<boolean> {
    await initPromise;
    // Find next pending reservation in FIFO queue
    const pendingList = await db
      .select()
      .from(reservations)
      .where(and(eq(reservations.bookId, bookId), eq(reservations.status, 'PENDING')))
      .orderBy(asc(reservations.queuePosition))
      .limit(1);

    if (pendingList.length === 0) {
      // No reservation waiting; copy is available
      await db
        .update(bookCopies)
        .set({ status: 'AVAILABLE', updatedAt: new Date() })
        .where(eq(bookCopies.id, copyId));
      return false;
    }

    const nextReservation = pendingList[0];
    const pickupHours = await LibrarySettingsService.getNumberSetting('RESERVATION_PICKUP_HOURS', 48);
    const availableUntil = new Date(Date.now() + pickupHours * 60 * 60 * 1000);

    // Update reservation
    await db
      .update(reservations)
      .set({
        assignedCopyId: copyId,
        status: 'AVAILABLE_FOR_PICKUP',
        availableUntil,
      })
      .where(eq(reservations.id, nextReservation.id));

    // Update copy status
    await db
      .update(bookCopies)
      .set({ status: 'RESERVED', updatedAt: new Date() })
      .where(eq(bookCopies.id, copyId));

    // Notify the member
    const [member] = await db.select().from(members).where(eq(members.id, nextReservation.memberId)).limit(1);
    const [book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);

    if (member) {
      await NotificationService.send({
        userId: member.userId,
        type: 'RESERVATION_AVAILABLE',
        title: 'Reserved Book Ready for Pickup!',
        message: `Your reserved copy of "${book ? book.title : 'Book'}" is now available at the circulation desk. Please collect it within ${pickupHours} hours.`,
        link: '/member/reservations',
      });
    }

    return true;
  }

  static async getMemberReservations(memberId: string) {
    await initPromise;
    const rows = await db
      .select({
        reservation: reservations,
        book: books,
      })
      .from(reservations)
      .innerJoin(books, eq(reservations.bookId, books.id))
      .where(eq(reservations.memberId, memberId))
      .orderBy(desc(reservations.reservedAt));

    return rows.map((r) => ({
      ...r.reservation,
      bookTitle: r.book.title,
      bookIsbn: r.book.isbn,
      bookCover: r.book.coverImageUrl,
    }));
  }

  static async getAllActiveReservations() {
    await initPromise;
    const rows = await db
      .select({
        reservation: reservations,
        book: books,
        member: members,
        user: users,
      })
      .from(reservations)
      .innerJoin(books, eq(reservations.bookId, books.id))
      .innerJoin(members, eq(reservations.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .where(sql`${reservations.status} IN ('PENDING', 'AVAILABLE_FOR_PICKUP')`)
      .orderBy(asc(reservations.queuePosition));

    return rows.map((r) => ({
      ...r.reservation,
      bookTitle: r.book.title,
      bookIsbn: r.book.isbn,
      memberName: `${r.user.firstName} ${r.user.lastName}`,
      memberCard: r.member.libraryCardNumber,
    }));
  }
}
