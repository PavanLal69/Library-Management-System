import { db, initPromise } from '../db';
import { members, users, loans, fines, reservations, books } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { AuditService } from './AuditService';

export class MemberService {
  static async getMemberById(memberId: string) {
    await initPromise;
    const rows = await db
      .select({
        member: members,
        user: users,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, memberId))
      .limit(1);

    if (rows.length === 0) return null;
    const { member, user } = rows[0];

    return {
      id: member.id,
      userId: user.id,
      libraryCardNumber: member.libraryCardNumber,
      universityId: member.universityId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      department: member.department,
      course: member.course,
      yearOfStudy: member.yearOfStudy,
      membershipType: member.membershipType,
      membershipStatus: member.membershipStatus,
      maxBorrowLimit: member.maxBorrowLimit,
      expiresAt: member.expiresAt,
      createdAt: member.createdAt,
    };
  }

  static async getMemberByCardNumber(cardNumber: string) {
    await initPromise;
    const cleanCard = cardNumber.trim();
    const rows = await db
      .select({
        member: members,
        user: users,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.libraryCardNumber, cleanCard))
      .limit(1);

    if (rows.length === 0) return null;
    const { member, user } = rows[0];

    // Also get active loans count and unpaid fines
    const activeLoans = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.memberId, member.id), eq(loans.status, 'ACTIVE')));

    const unpaidFines = await db
      .select()
      .from(fines)
      .where(and(eq(fines.memberId, member.id), eq(fines.status, 'PENDING')));

    const fineTotal = unpaidFines.reduce(
      (sum, f) => sum + parseFloat(f.amount) - parseFloat(f.paidAmount),
      0
    );

    return {
      id: member.id,
      userId: user.id,
      libraryCardNumber: member.libraryCardNumber,
      universityId: member.universityId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      department: member.department,
      course: member.course,
      yearOfStudy: member.yearOfStudy,
      membershipType: member.membershipType,
      membershipStatus: member.membershipStatus,
      maxBorrowLimit: member.maxBorrowLimit,
      activeLoansCount: activeLoans.length,
      unpaidFineTotal: Number(fineTotal.toFixed(2)),
    };
  }

  static async searchMembers(query?: string) {
    await initPromise;
    const rows = await db
      .select({
        member: members,
        user: users,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id));

    if (!query || query.trim().length === 0) {
      return rows.map((r) => ({
        id: r.member.id,
        libraryCardNumber: r.member.libraryCardNumber,
        universityId: r.member.universityId,
        name: `${r.user.firstName} ${r.user.lastName}`,
        email: r.user.email,
        department: r.member.department,
        membershipStatus: r.member.membershipStatus,
        maxBorrowLimit: r.member.maxBorrowLimit,
      }));
    }

    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        r.user.firstName.toLowerCase().includes(q) ||
        r.user.lastName.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        r.member.libraryCardNumber.toLowerCase().includes(q) ||
        (r.member.universityId && r.member.universityId.toLowerCase().includes(q))
    );

    return filtered.map((r) => ({
      id: r.member.id,
      libraryCardNumber: r.member.libraryCardNumber,
      universityId: r.member.universityId,
      name: `${r.user.firstName} ${r.user.lastName}`,
      email: r.user.email,
      department: r.member.department,
      membershipStatus: r.member.membershipStatus,
      maxBorrowLimit: r.member.maxBorrowLimit,
    }));
  }

  static async updateStatus(memberId: string, status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED', actorId: string) {
    await initPromise;
    const [updated] = await db
      .update(members)
      .set({ membershipStatus: status, updatedAt: new Date() })
      .where(eq(members.id, memberId))
      .returning();

    await AuditService.log({
      actorId,
      action: 'MEMBER_STATUS_UPDATE',
      entityType: 'MEMBER',
      entityId: memberId,
      metadata: { newStatus: status },
    });

    return updated;
  }

  static async getDashboardSummary(memberId: string) {
    await initPromise;
    const allLoans = await db
      .select({
        loan: loans,
        book: books,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(eq(loans.memberId, memberId))
      .orderBy(desc(loans.issuedAt));

    const now = new Date();
    const activeLoans = allLoans.filter((l) => l.loan.status === 'ACTIVE');
    const overdueLoans = activeLoans.filter((l) => new Date(l.loan.dueAt) < now);

    const userFines = await db
      .select()
      .from(fines)
      .where(eq(fines.memberId, memberId));

    const pendingFines = userFines.filter((f) => f.status === 'PENDING' || f.status === 'PARTIALLY_PAID');
    const totalUnpaidFines = pendingFines.reduce(
      (sum, f) => sum + parseFloat(f.amount) - parseFloat(f.paidAmount),
      0
    );

    const userReservations = await db
      .select({
        reservation: reservations,
        book: books,
      })
      .from(reservations)
      .innerJoin(books, eq(reservations.bookId, books.id))
      .where(
        and(
          eq(reservations.memberId, memberId),
          sql`${reservations.status} IN ('PENDING', 'AVAILABLE_FOR_PICKUP')`
        )
      );

    return {
      activeLoansCount: activeLoans.length,
      overdueLoansCount: overdueLoans.length,
      unpaidFinesTotal: Number(totalUnpaidFines.toFixed(2)),
      activeReservationsCount: userReservations.length,
      currentLoans: activeLoans.map((l) => ({
        ...l.loan,
        bookTitle: l.book.title,
        bookCover: l.book.coverImageUrl,
        isOverdue: new Date(l.loan.dueAt) < now,
        daysRemaining: Math.ceil((new Date(l.loan.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      pendingFines,
      reservations: userReservations.map((r) => ({
        ...r.reservation,
        bookTitle: r.book.title,
        bookCover: r.book.coverImageUrl,
      })),
    };
  }
}
