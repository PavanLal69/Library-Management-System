import { db, initPromise } from '../db';
import { loans, bookCopies, books, members, users, reservations, fines } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { LibrarySettingsService } from './LibrarySettingsService';
import { FineService } from './FineService';
import { ReservationService } from './ReservationService';
import { NotificationService } from './NotificationService';
import { AuditService } from './AuditService';

export class LoanService {
  static async issueLoan(params: {
    memberId: string;
    copyId: string;
    issuedBy: string;
    notes?: string;
  }) {
    await initPromise;

    // 1. Verify Member
    const [member] = await db.select().from(members).where(eq(members.id, params.memberId)).limit(1);
    if (!member) throw new Error('Member not found.');
    if (member.membershipStatus !== 'ACTIVE') {
      throw new Error(`Member is currently ${member.membershipStatus}. Cannot issue books.`);
    }

    // 2. Check active loans limit
    const activeLoans = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.memberId, params.memberId), eq(loans.status, 'ACTIVE')));

    if (activeLoans.length >= member.maxBorrowLimit) {
      throw new Error(`Borrowing limit reached (${member.maxBorrowLimit} books maximum). Please return a book first.`);
    }

    // 3. Check blocking fines (e.g. > $10.00 unpaid)
    const unpaidFineTotal = await FineService.getOutstandingFineTotal(params.memberId);
    if (unpaidFineTotal > 10.0) {
      throw new Error(`Account has $${unpaidFineTotal.toFixed(2)} in outstanding fines. Fines must be paid before borrowing.`);
    }

    // 4. Verify Copy availability
    const [copy] = await db.select().from(bookCopies).where(eq(bookCopies.id, params.copyId)).limit(1);
    if (!copy) throw new Error('Physical book copy not found.');

    if (copy.status === 'BORROWED') {
      throw new Error('This physical copy is already checked out.');
    }

    if (copy.status === 'LOST' || copy.status === 'DAMAGED' || copy.status === 'MAINTENANCE') {
      throw new Error(`This copy is unavailable due to its condition status: ${copy.status}.`);
    }

    // If RESERVED, verify that it was reserved for this exact member
    if (copy.status === 'RESERVED') {
      const [pickupReservation] = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.assignedCopyId, copy.id),
            eq(reservations.status, 'AVAILABLE_FOR_PICKUP')
          )
        )
        .limit(1);

      if (pickupReservation && pickupReservation.memberId !== params.memberId) {
        throw new Error('This copy is currently reserved for another library member on the waitlist.');
      }
    }

    // 5. Calculate Due Date
    const loanDays = await LibrarySettingsService.getNumberSetting('LOAN_PERIOD_DAYS', 14);
    const issuedAt = new Date();
    const dueAt = new Date(issuedAt.getTime() + loanDays * 24 * 60 * 60 * 1000);

    // 6. Execute atomic state transition
    const [loan] = await db
      .insert(loans)
      .values({
        memberId: params.memberId,
        copyId: copy.id,
        bookId: copy.bookId,
        issuedBy: params.issuedBy,
        issuedAt,
        dueAt,
        status: 'ACTIVE',
        notes: params.notes || null,
      })
      .returning();

    // Update copy status to BORROWED
    await db
      .update(bookCopies)
      .set({ status: 'BORROWED', updatedAt: new Date() })
      .where(eq(bookCopies.id, copy.id));

    // Fulfill reservation if applicable
    await db
      .update(reservations)
      .set({
        status: 'FULFILLED',
        fulfilledAt: new Date(),
      })
      .where(
        and(
          eq(reservations.memberId, params.memberId),
          eq(reservations.bookId, copy.bookId),
          sql`${reservations.status} IN ('PENDING', 'AVAILABLE_FOR_PICKUP')`
        )
      );

    // Fetch book details for notification
    const [book] = await db.select().from(books).where(eq(books.id, copy.bookId)).limit(1);

    // Notify member
    await NotificationService.send({
      userId: member.userId,
      type: 'BOOK_ISSUED',
      title: 'Book Issued Successfully',
      message: `"${book ? book.title : 'Book'}" has been checked out to you. Due date: ${dueAt.toLocaleDateString()}.`,
      link: '/member/loans',
    });

    // Record audit event
    await AuditService.log({
      actorId: params.issuedBy,
      action: 'BORROW_CREATE',
      entityType: 'LOAN',
      entityId: loan.id,
      metadata: { memberId: params.memberId, copyId: copy.id, barcode: copy.barcode, dueAt },
    });

    return {
      loan,
      book,
      copy,
    };
  }

  static async returnLoan(params: {
    barcode: string;
    returnedBy: string;
    condition?: string;
    notes?: string;
  }) {
    await initPromise;
    const cleanBarcode = params.barcode.trim();

    // 1. Locate Copy
    const [copy] = await db.select().from(bookCopies).where(eq(bookCopies.barcode, cleanBarcode)).limit(1);
    if (!copy) throw new Error(`No book copy found with barcode "${cleanBarcode}".`);

    // 2. Locate Active Loan
    const [loan] = await db
      .select()
      .from(loans)
      .where(and(eq(loans.copyId, copy.id), eq(loans.status, 'ACTIVE')))
      .limit(1);

    if (!loan) {
      throw new Error(`This physical copy (${cleanBarcode}) has no active loan record.`);
    }

    const now = new Date();

    // 3. Calculate Overdue Fine
    const { overdueDays, fineAmount } = await FineService.calculateOverdueFine(new Date(loan.dueAt), now);
    let createdFine = null;

    if (fineAmount > 0) {
      createdFine = await FineService.createFine({
        memberId: loan.memberId,
        loanId: loan.id,
        type: 'OVERDUE',
        amount: fineAmount,
        reason: `Overdue return: ${overdueDays} days past due date`,
        actorId: params.returnedBy,
      });
    }

    // 4. Update Loan Record
    const [updatedLoan] = await db
      .update(loans)
      .set({
        status: 'RETURNED',
        returnedAt: now,
        returnedBy: params.returnedBy,
        notes: params.notes || loan.notes,
      })
      .where(eq(loans.id, loan.id))
      .returning();

    // 5. Update Copy Condition if changed
    if (params.condition && params.condition !== copy.condition) {
      await db
        .update(bookCopies)
        .set({ condition: params.condition, updatedAt: new Date() })
        .where(eq(bookCopies.id, copy.id));
    }

    // 6. Check Waitlist / Reservation Queue
    const wasReservedByNext = await ReservationService.assignCopyOnReturn(copy.id, copy.bookId);

    // 7. Notify Member
    const [member] = await db.select().from(members).where(eq(members.id, loan.memberId)).limit(1);
    const [book] = await db.select().from(books).where(eq(books.id, copy.bookId)).limit(1);

    if (member) {
      await NotificationService.send({
        userId: member.userId,
        type: 'BOOK_RETURNED',
        title: 'Book Return Confirmed',
        message: `Your return for "${book ? book.title : 'Book'}" has been processed.${
          fineAmount > 0 ? ` An overdue fine of $${fineAmount.toFixed(2)} was assessed.` : ''
        }`,
        link: '/member/loans',
      });
    }

    // 8. Audit Log
    await AuditService.log({
      actorId: params.returnedBy,
      action: 'BORROW_RETURN',
      entityType: 'LOAN',
      entityId: loan.id,
      metadata: {
        barcode: copy.barcode,
        overdueDays,
        fineAssessed: fineAmount,
        reservedForWaitlist: wasReservedByNext,
      },
    });

    return {
      loan: updatedLoan,
      copy,
      book,
      overdueDays,
      fine: createdFine,
      wasReservedByNext,
    };
  }

  static async renewLoan(loanId: string, actorId: string) {
    await initPromise;
    const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (!loan) throw new Error('Loan record not found.');
    if (loan.status !== 'ACTIVE') {
      throw new Error(`Cannot renew loan with status "${loan.status}".`);
    }

    const maxRenewals = await LibrarySettingsService.getNumberSetting('MAX_RENEWALS', 2);
    if (loan.renewedCount >= maxRenewals) {
      throw new Error(`Maximum renewal limit (${maxRenewals} times) reached for this loan.`);
    }

    // Cannot renew if already overdue
    if (new Date(loan.dueAt) < new Date()) {
      throw new Error('Overdue books cannot be renewed. Please return the book and pay any accumulated fines.');
    }

    // Check reservation queue: cannot renew if someone is waiting!
    const pendingReservations = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(and(eq(reservations.bookId, loan.bookId), eq(reservations.status, 'PENDING')));

    if (pendingReservations.length > 0) {
      throw new Error('This book cannot be renewed because other members are currently waiting in the reservation queue.');
    }

    const loanDays = await LibrarySettingsService.getNumberSetting('LOAN_PERIOD_DAYS', 14);
    const newDueAt = new Date(new Date(loan.dueAt).getTime() + loanDays * 24 * 60 * 60 * 1000);

    const [updated] = await db
      .update(loans)
      .set({
        dueAt: newDueAt,
        renewedCount: loan.renewedCount + 1,
      })
      .where(eq(loans.id, loanId))
      .returning();

    const [book] = await db.select().from(books).where(eq(books.id, loan.bookId)).limit(1);
    const [member] = await db.select().from(members).where(eq(members.id, loan.memberId)).limit(1);

    if (member) {
      await NotificationService.send({
        userId: member.userId,
        type: 'BOOK_RENEWED',
        title: 'Book Loan Renewed',
        message: `"${book ? book.title : 'Book'}" renewal confirmed. New due date: ${newDueAt.toLocaleDateString()}.`,
        link: '/member/loans',
      });
    }

    await AuditService.log({
      actorId,
      action: 'BORROW_RENEW',
      entityType: 'LOAN',
      entityId: loanId,
      metadata: { renewedCount: updated.renewedCount, newDueAt },
    });

    return updated;
  }

  static async getMemberLoans(memberId: string) {
    await initPromise;
    const rows = await db
      .select({
        loan: loans,
        book: books,
        copy: bookCopies,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .innerJoin(bookCopies, eq(loans.copyId, bookCopies.id))
      .where(eq(loans.memberId, memberId))
      .orderBy(desc(loans.issuedAt));

    const now = new Date();

    return rows.map((r) => {
      const dueAt = new Date(r.loan.dueAt);
      const isOverdue = r.loan.status === 'ACTIVE' && dueAt < now;
      const daysRemaining = Math.ceil((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...r.loan,
        bookTitle: r.book.title,
        bookIsbn: r.book.isbn,
        bookCover: r.book.coverImageUrl,
        copyBarcode: r.copy.barcode,
        isOverdue,
        daysRemaining: r.loan.status === 'ACTIVE' ? daysRemaining : 0,
      };
    });
  }

  static async getAllLoans(filterStatus?: string) {
    await initPromise;
    const query = db
      .select({
        loan: loans,
        book: books,
        copy: bookCopies,
        member: members,
        user: users,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .innerJoin(bookCopies, eq(loans.copyId, bookCopies.id))
      .innerJoin(members, eq(loans.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .orderBy(desc(loans.issuedAt));

    const rows = await query;
    const now = new Date();

    const filtered = filterStatus ? rows.filter((r) => r.loan.status === filterStatus) : rows;

    return filtered.map((r) => {
      const dueAt = new Date(r.loan.dueAt);
      const isOverdue = r.loan.status === 'ACTIVE' && dueAt < now;
      return {
        ...r.loan,
        bookTitle: r.book.title,
        bookIsbn: r.book.isbn,
        copyBarcode: r.copy.barcode,
        memberName: `${r.user.firstName} ${r.user.lastName}`,
        memberCard: r.member.libraryCardNumber,
        memberEmail: r.user.email,
        isOverdue,
      };
    });
  }
}
