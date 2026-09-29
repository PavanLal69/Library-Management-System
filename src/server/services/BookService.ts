import { db, initPromise } from '../db';
import {
  books,
  bookAuthors,
  authors,
  bookCategories,
  categories,
  publishers,
  languages,
  bookCopies,
  bookReviews,
  loans,
} from '../db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { BookCopyService } from './BookCopyService';
import { AuditService } from './AuditService';
import { getBookCoverUrl } from '../../lib/book-covers';

export interface BookSearchFilters {
  query?: string;
  categoryId?: string;
  authorId?: string;
  availableOnly?: boolean;
  sortBy?: 'relevance' | 'title' | 'year' | 'availability';
  page?: number;
  limit?: number;
}

export interface BookCardResult {
  id: string;
  isbn: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverImageUrl: string | null;
  publicationYear: number | null;
  edition: string | null;
  authors: Array<{ id: string; name: string; isPrimary: boolean }>;
  categories: Array<{ id: string; name: string }>;
  publisherName: string | null;
  totalCopies: number;
  availableCopies: number;
  averageRating: number;
  reviewCount: number;
}

export class BookService {
  static async searchBooks(filters: BookSearchFilters = {}) {
    await initPromise;
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    // Fetch all books first or matching basic text criteria
    const allBooks = await db.select().from(books);

    // Fetch relational mappings in batch
    const allAuthors = await db
      .select({
        bookId: bookAuthors.bookId,
        authorId: authors.id,
        authorName: authors.name,
        isPrimary: bookAuthors.isPrimary,
      })
      .from(bookAuthors)
      .innerJoin(authors, eq(bookAuthors.authorId, authors.id));

    const allCategories = await db
      .select({
        bookId: bookCategories.bookId,
        categoryId: categories.id,
        categoryName: categories.name,
      })
      .from(bookCategories)
      .innerJoin(categories, eq(bookCategories.categoryId, categories.id));

    const allPublishers = await db.select().from(publishers);
    const publisherMap = new Map<string, string>();
    allPublishers.forEach((p) => publisherMap.set(p.id, p.name));

    // Copies aggregation
    const allCopies = await db.select().from(bookCopies);
    const copiesCountMap = new Map<string, { total: number; available: number }>();
    for (const copy of allCopies) {
      const entry = copiesCountMap.get(copy.bookId) || { total: 0, available: 0 };
      entry.total += 1;
      if (copy.status === 'AVAILABLE') {
        entry.available += 1;
      }
      copiesCountMap.set(copy.bookId, entry);
    }

    // Reviews aggregation
    const allReviews = await db.select().from(bookReviews);
    const reviewsMap = new Map<string, { sum: number; count: number }>();
    for (const rev of allReviews) {
      const entry = reviewsMap.get(rev.bookId) || { sum: 0, count: 0 };
      entry.sum += rev.rating;
      entry.count += 1;
      reviewsMap.set(rev.bookId, entry);
    }

    // Map authors & categories to book
    const authorsByBook = new Map<string, Array<{ id: string; name: string; isPrimary: boolean }>>();
    allAuthors.forEach((a) => {
      const list = authorsByBook.get(a.bookId) || [];
      list.push({ id: a.authorId, name: a.authorName, isPrimary: a.isPrimary });
      authorsByBook.set(a.bookId, list);
    });

    const categoriesByBook = new Map<string, Array<{ id: string; name: string }>>();
    allCategories.forEach((c) => {
      const list = categoriesByBook.get(c.bookId) || [];
      list.push({ id: c.categoryId, name: c.categoryName });
      categoriesByBook.set(c.bookId, list);
    });

    // Transform books
    let results: BookCardResult[] = allBooks.map((b) => {
      const bAuthors = authorsByBook.get(b.id) || [];
      const bCats = categoriesByBook.get(b.id) || [];
      const counts = copiesCountMap.get(b.id) || { total: 0, available: 0 };
      const rev = reviewsMap.get(b.id) || { sum: 0, count: 0 };
      const avgRating = rev.count > 0 ? Number((rev.sum / rev.count).toFixed(1)) : 4.5;

      return {
        id: b.id,
        isbn: b.isbn,
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        coverImageUrl: getBookCoverUrl({ isbn: b.isbn, title: b.title, coverImageUrl: b.coverImageUrl }),
        publicationYear: b.publicationYear,
        edition: b.edition,
        authors: bAuthors,
        categories: bCats,
        publisherName: b.publisherId ? publisherMap.get(b.publisherId) || null : null,
        totalCopies: counts.total,
        availableCopies: counts.available,
        averageRating: avgRating,
        reviewCount: rev.count,
      };
    });

    // Apply Filter: Query (Title, ISBN, Author, Description)
    if (filters.query && filters.query.trim().length > 0) {
      const q = filters.query.trim().toLowerCase();
      results = results.filter((b) => {
        const titleMatch = b.title.toLowerCase().includes(q);
        const isbnMatch = b.isbn.toLowerCase().includes(q);
        const authorMatch = b.authors.some((a) => a.name.toLowerCase().includes(q));
        const catMatch = b.categories.some((c) => c.name.toLowerCase().includes(q));
        const pubMatch = b.publisherName ? b.publisherName.toLowerCase().includes(q) : false;
        const descMatch = b.description ? b.description.toLowerCase().includes(q) : false;
        return titleMatch || isbnMatch || authorMatch || catMatch || pubMatch || descMatch;
      });
    }

    // Apply Filter: Category
    if (filters.categoryId) {
      results = results.filter((b) => b.categories.some((c) => c.id === filters.categoryId));
    }

    // Apply Filter: Author
    if (filters.authorId) {
      results = results.filter((b) => b.authors.some((a) => a.id === filters.authorId));
    }

    // Apply Filter: Availability
    if (filters.availableOnly) {
      results = results.filter((b) => b.availableCopies > 0);
    }

    // Apply Sorting
    if (filters.sortBy === 'title') {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sortBy === 'year') {
      results.sort((a, b) => (b.publicationYear || 0) - (a.publicationYear || 0));
    } else if (filters.sortBy === 'availability') {
      results.sort((a, b) => b.availableCopies - a.availableCopies);
    } else {
      // Default: relevance / rating
      results.sort((a, b) => b.averageRating - a.averageRating);
    }

    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return {
      books: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getBookById(id: string) {
    await initPromise;
    const [book] = await db.select().from(books).where(eq(books.id, id)).limit(1);
    if (!book) return null;

    // Authors
    const bookAuthorsRows = await db
      .select({
        id: authors.id,
        name: authors.name,
        biography: authors.biography,
        isPrimary: bookAuthors.isPrimary,
      })
      .from(bookAuthors)
      .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
      .where(eq(bookAuthors.bookId, id));

    // Categories
    const catRows = await db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(bookCategories)
      .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
      .where(eq(bookCategories.bookId, id));

    // Publisher & Language
    let publisher = null;
    if (book.publisherId) {
      const [pub] = await db.select().from(publishers).where(eq(publishers.id, book.publisherId)).limit(1);
      publisher = pub || null;
    }

    let language = null;
    if (book.languageId) {
      const [lang] = await db.select().from(languages).where(eq(languages.id, book.languageId)).limit(1);
      language = lang || null;
    }

    // Copies with real-time location resolution
    const copies = await BookCopyService.getCopiesByBookId(id);

    // Reviews
    const reviews = await db.select().from(bookReviews).where(eq(bookReviews.bookId, id));
    const avgRating =
      reviews.length > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 4.8;

    return {
      ...book,
      coverImageUrl: getBookCoverUrl({ isbn: book.isbn, title: book.title, coverImageUrl: book.coverImageUrl }),
      authors: bookAuthorsRows,
      categories: catRows,
      publisher,
      language,
      copies,
      reviews,
      averageRating: avgRating,
      totalCopies: copies.length,
      availableCopies: copies.filter((c) => c.status === 'AVAILABLE').length,
    };
  }

  static async createBook(
    data: {
      isbn: string;
      title: string;
      subtitle?: string;
      description?: string;
      publicationYear?: number;
      edition?: string;
      pages?: number;
      coverImageUrl?: string;
      publisherId?: string;
      languageId?: string;
      authorIds?: string[];
      categoryIds?: string[];
      initialCopiesCount?: number;
      initialShelfId?: string;
    },
    actorId: string
  ) {
    await initPromise;

    // Check unique ISBN
    const existing = await db.select().from(books).where(eq(books.isbn, data.isbn.trim())).limit(1);
    if (existing.length > 0) {
      throw new Error(`A book with ISBN ${data.isbn} already exists.`);
    }

    const [newBook] = await db
      .insert(books)
      .values({
        isbn: data.isbn.trim(),
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        description: data.description?.trim() || null,
        publicationYear: data.publicationYear || new Date().getFullYear(),
        edition: data.edition?.trim() || '1st Edition',
        pages: data.pages || 350,
        coverImageUrl: data.coverImageUrl || null,
        publisherId: data.publisherId || null,
        languageId: data.languageId || null,
      })
      .returning();

    // Link authors
    if (data.authorIds && data.authorIds.length > 0) {
      for (let i = 0; i < data.authorIds.length; i++) {
        await db.insert(bookAuthors).values({
          bookId: newBook.id,
          authorId: data.authorIds[i],
          isPrimary: i === 0,
        });
      }
    }

    // Link categories
    if (data.categoryIds && data.categoryIds.length > 0) {
      for (const catId of data.categoryIds) {
        await db.insert(bookCategories).values({
          bookId: newBook.id,
          categoryId: catId,
        });
      }
    }

    // Create initial physical copies if requested
    const count = data.initialCopiesCount ?? 2;
    for (let i = 0; i < count; i++) {
      await BookCopyService.createCopy({
        bookId: newBook.id,
        shelfId: data.initialShelfId || null,
        condition: 'NEW',
        price: 34.99,
        actorId,
      });
    }

    await AuditService.log({
      actorId,
      action: 'BOOK_CREATE',
      entityType: 'BOOK',
      entityId: newBook.id,
      metadata: { isbn: newBook.isbn, title: newBook.title },
    });

    return this.getBookById(newBook.id);
  }

  static async updateBook(
    id: string,
    data: Partial<{
      title: string;
      subtitle: string;
      description: string;
      publicationYear: number;
      edition: string;
      coverImageUrl: string;
    }>,
    actorId: string
  ) {
    await initPromise;
    const [updated] = await db
      .update(books)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(books.id, id))
      .returning();

    await AuditService.log({
      actorId,
      action: 'BOOK_UPDATE',
      entityType: 'BOOK',
      entityId: id,
      metadata: data,
    });

    return updated;
  }
}
