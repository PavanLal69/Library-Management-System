import { db, initPromise } from '../db';
import { bookCopies, books, shelves, inventoryTransactions, loans } from '../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { BookCopyService } from './BookCopyService';
import { FineService } from './FineService';
import { AuditService } from './AuditService';

export class InventoryService {
  static async getStats() {
    await initPromise;
    const allCopies = await db.select().from(bookCopies);
    const allBooks = await db.select({ id: books.id }).from(books);

    const counts = {
      totalBooks: allBooks.length,
      totalCopies: allCopies.length,
      available: 0,
      borrowed: 0,
      reserved: 0,
      lost: 0,
      damaged: 0,
      maintenance: 0,
      archived: 0,
      totalValuation: 0,
    };

    for (const copy of allCopies) {
      const price = parseFloat(copy.price || '0');
      counts.totalValuation += isNaN(price) ? 0 : price;

      switch (copy.status) {
        case 'AVAILABLE':
          counts.available += 1;
          break;
        case 'BORROWED':
          counts.borrowed += 1;
          break;
        case 'RESERVED':
          counts.reserved += 1;
          break;
        case 'LOST':
          counts.lost += 1;
          break;
        case 'DAMAGED':
          counts.damaged += 1;
          break;
        case 'MAINTENANCE':
          counts.maintenance += 1;
          break;
        case 'ARCHIVED':
          counts.archived += 1;
          break;
        default:
          break;
      }
    }

    counts.totalValuation = Number(counts.totalValuation.toFixed(2));
    return counts;
  }

  static async reportDamageOrLoss(params: {
    copyId: string;
    status: 'DAMAGED' | 'LOST';
    notes: string;
    chargeFee?: number;
    actorId: string;
  }) {
    await initPromise;
    const [copy] = await db.select().from(bookCopies).where(eq(bookCopies.id, params.copyId)).limit(1);
    if (!copy) throw new Error('Copy not found');

    // Update copy status
    await BookCopyService.updateStatus({
      copyId: copy.id,
      newStatus: params.status,
      notes: params.notes,
      actorId: params.actorId,
    });

    // If there's an active loan, assess fine to borrower
    if (params.chargeFee && params.chargeFee > 0) {
      const [activeLoan] = await db
        .select()
        .from(loans)
        .where(eq(loans.copyId, copy.id))
        .orderBy(desc(loans.issuedAt))
        .limit(1);

      if (activeLoan) {
        await FineService.createFine({
          memberId: activeLoan.memberId,
          loanId: activeLoan.id,
          type: params.status === 'LOST' ? 'LOST_BOOK' : 'DAMAGED_BOOK',
          amount: params.chargeFee,
          reason: `${params.status} book charge: ${params.notes}`,
          actorId: params.actorId,
        });
      }
    }

    return { success: true };
  }

  static async transferShelf(copyId: string, newShelfId: string, actorId: string) {
    await initPromise;
    const [copy] = await db.select().from(bookCopies).where(eq(bookCopies.id, copyId)).limit(1);
    if (!copy) throw new Error('Copy not found');

    const previousShelfId = copy.shelfId;

    await db
      .update(bookCopies)
      .set({ shelfId: newShelfId, updatedAt: new Date() })
      .where(eq(bookCopies.id, copyId));

    await db.insert(inventoryTransactions).values({
      copyId,
      performedBy: actorId,
      transactionType: 'SHELF_TRANSFER',
      previousShelfId,
      newShelfId,
      notes: 'Shelf location relocation',
    });

    await AuditService.log({
      actorId,
      action: 'INVENTORY_TRANSFER',
      entityType: 'BOOK_COPY',
      entityId: copyId,
      metadata: { fromShelf: previousShelfId, toShelf: newShelfId },
    });

    return { success: true };
  }

  static async exportToCsv(): Promise<string> {
    await initPromise;
    const rows = await db
      .select({
        barcode: bookCopies.barcode,
        accession: bookCopies.accessionNumber,
        title: books.title,
        isbn: books.isbn,
        status: bookCopies.status,
        condition: bookCopies.condition,
        price: bookCopies.price,
      })
      .from(bookCopies)
      .innerJoin(books, eq(bookCopies.bookId, books.id));

    let csv = 'Barcode,AccessionNumber,Title,ISBN,Status,Condition,Price\n';
    for (const r of rows) {
      const sanitizedTitle = `"${r.title.replace(/"/g, '""')}"`;
      csv += `${r.barcode},${r.accession},${sanitizedTitle},${r.isbn},${r.status},${r.condition},${r.price}\n`;
    }
    return csv;
  }
}
