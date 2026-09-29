import { db, initPromise } from '../db';
import { loans, books, members, fines, bookCategories, categories, bookCopies } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export class AnalyticsService {
  static async getCirculationStats() {
    await initPromise;
    const allLoans = await db.select().from(loans);
    const allBooks = await db.select().from(books);
    const allMembers = await db.select().from(members);
    const allFines = await db.select().from(fines);
    const allCopies = await db.select().from(bookCopies);

    const now = new Date();

    // Today's statistics
    const todayStr = now.toISOString().slice(0, 10);
    let issuedToday = 0;
    let returnedToday = 0;
    let activeLoansCount = 0;
    let overdueCount = 0;

    for (const l of allLoans) {
      const issuedDateStr = new Date(l.issuedAt).toISOString().slice(0, 10);
      if (issuedDateStr === todayStr) issuedToday += 1;

      if (l.returnedAt) {
        const retDateStr = new Date(l.returnedAt).toISOString().slice(0, 10);
        if (retDateStr === todayStr) returnedToday += 1;
      }

      if (l.status === 'ACTIVE') {
        activeLoansCount += 1;
        if (new Date(l.dueAt) < now) {
          overdueCount += 1;
        }
      }
    }

    // Daily circulation for last 14 days
    const dailyMap = new Map<string, { date: string; issued: number; returned: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(5, 10); // MM-DD
      dailyMap.set(dateKey, { date: dateKey, issued: 0, returned: 0 });
    }

    for (const l of allLoans) {
      const issuedKey = new Date(l.issuedAt).toISOString().slice(5, 10);
      if (dailyMap.has(issuedKey)) {
        dailyMap.get(issuedKey)!.issued += 1;
      }
      if (l.returnedAt) {
        const retKey = new Date(l.returnedAt).toISOString().slice(5, 10);
        if (dailyMap.has(retKey)) {
          dailyMap.get(retKey)!.returned += 1;
        }
      }
    }

    const dailyCirculation = Array.from(dailyMap.values());

    // Most borrowed books
    const bookBorrowCount = new Map<string, number>();
    for (const l of allLoans) {
      bookBorrowCount.set(l.bookId, (bookBorrowCount.get(l.bookId) || 0) + 1);
    }

    const bookMap = new Map<string, string>();
    allBooks.forEach((b) => bookMap.set(b.id, b.title));

    const mostBorrowed = Array.from(bookBorrowCount.entries())
      .map(([bookId, count]) => ({
        bookId,
        title: bookMap.get(bookId) || 'Unknown Book',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Fines overview
    let totalAssessedFines = 0;
    let totalCollectedFines = 0;
    for (const f of allFines) {
      totalAssessedFines += parseFloat(f.amount || '0');
      totalCollectedFines += parseFloat(f.paidAmount || '0');
    }

    // Categories breakdown
    const catRows = await db
      .select({
        catName: categories.name,
        bookId: bookCategories.bookId,
      })
      .from(bookCategories)
      .innerJoin(categories, eq(bookCategories.categoryId, categories.id));

    const catBookMap = new Map<string, string>();
    catRows.forEach((r) => catBookMap.set(r.bookId, r.catName));

    const categoryLoansMap = new Map<string, number>();
    for (const l of allLoans) {
      const cat = catBookMap.get(l.bookId) || 'General';
      categoryLoansMap.set(cat, (categoryLoansMap.get(cat) || 0) + 1);
    }

    const categoryDistribution = Array.from(categoryLoansMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      metrics: {
        totalMembers: allMembers.length,
        catalogSize: allBooks.length,
        totalCopies: allCopies.length,
        activeLoans: activeLoansCount,
        overdueLoans: overdueCount,
        issuedToday,
        returnedToday,
        totalFinesAssessed: Number(totalAssessedFines.toFixed(2)),
        totalFinesCollected: Number(totalCollectedFines.toFixed(2)),
        outstandingFines: Number((totalAssessedFines - totalCollectedFines).toFixed(2)),
      },
      dailyCirculation,
      mostBorrowed,
      categoryDistribution,
    };
  }
}
