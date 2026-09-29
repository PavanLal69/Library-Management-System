import { db, initPromise } from '../db';
import { loans, books, bookCategories, bookAuthors, bookCopies } from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { BookService, BookCardResult } from './BookService';

export class RecommendationService {
  static async getRecommendationsForMember(memberId: string, limit = 6): Promise<BookCardResult[]> {
    await initPromise;

    // 1. Get member's borrowed books
    const memberLoans = await db.select({ bookId: loans.bookId }).from(loans).where(eq(loans.memberId, memberId));
    const borrowedBookIds = new Set(memberLoans.map((l) => l.bookId));

    // If member has no loans yet, return top available books
    if (borrowedBookIds.size === 0) {
      const topBooks = await BookService.searchBooks({
        availableOnly: true,
        limit,
        sortBy: 'relevance',
      });
      return topBooks.books;
    }

    // 2. Identify favorite categories & authors from borrow history
    const historyBookIds = Array.from(borrowedBookIds);

    const historyCategories = await db
      .select({ categoryId: bookCategories.categoryId })
      .from(bookCategories)
      .where(inArray(bookCategories.bookId, historyBookIds));

    const historyAuthors = await db
      .select({ authorId: bookAuthors.authorId })
      .from(bookAuthors)
      .where(inArray(bookAuthors.bookId, historyBookIds));

    const preferredCategoryIds = new Set(historyCategories.map((c) => c.categoryId));
    const preferredAuthorIds = new Set(historyAuthors.map((a) => a.authorId));

    // 3. Search all books
    const catalog = await BookService.searchBooks({ limit: 100 });

    // 4. Score candidates deterministically
    const scored = catalog.books
      // Exclude books the member has already borrowed
      .filter((b) => !borrowedBookIds.has(b.id))
      .map((book) => {
        let score = 0;

        // Author affinity (+15 per matching author)
        for (const a of book.authors) {
          if (preferredAuthorIds.has(a.id)) {
            score += 15;
          }
        }

        // Category affinity (+10 per matching category)
        for (const c of book.categories) {
          if (preferredCategoryIds.has(c.id)) {
            score += 10;
          }
        }

        // Availability bonus (+8 if copy is ready on shelf right now)
        if (book.availableCopies > 0) {
          score += 8;
        }

        // Quality rating signal
        score += book.averageRating * 2;

        return { book, score };
      });

    // Sort by calculated affinity score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.book);
  }
}
