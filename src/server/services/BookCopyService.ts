import { db, initPromise } from '../db';
import { bookCopies, books, shelves, inventoryTransactions } from '../db/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { ShelvingService } from './ShelvingService';
import { AuditService } from './AuditService';

export interface BookCopyDetail {
  id: string;
  bookId: string;
  bookTitle?: string;
  bookIsbn?: string;
  barcode: string;
  qrCode: string;
  accessionNumber: string;
  shelfId: string | null;
  shelfLocation?: string;
  condition: string;
  status: string;
  price: string;
  acquisitionDate: Date;
  notes: string | null;
}

export class BookCopyService {
  static async getCopiesByBookId(bookId: string): Promise<BookCopyDetail[]> {
    await initPromise;
    const copies = await db.select().from(bookCopies).where(eq(bookCopies.bookId, bookId));

    const results: BookCopyDetail[] = [];
    for (const copy of copies) {
      let location = 'Unassigned';
      if (copy.shelfId) {
        const shelf = await ShelvingService.getShelfLocation(copy.shelfId);
        if (shelf) location = shelf.formattedLocation;
      }

      results.push({
        id: copy.id,
        bookId: copy.bookId,
        barcode: copy.barcode,
        qrCode: copy.qrCode,
        accessionNumber: copy.accessionNumber,
        shelfId: copy.shelfId,
        shelfLocation: location,
        condition: copy.condition,
        status: copy.status,
        price: copy.price,
        acquisitionDate: new Date(copy.acquisitionDate),
        notes: copy.notes,
      });
    }

    return results;
  }

  static async getCopyByBarcode(barcode: string): Promise<BookCopyDetail | null> {
    await initPromise;
    const cleanBarcode = barcode.trim();
    const rows = await db
      .select({
        copy: bookCopies,
        book: books,
      })
      .from(bookCopies)
      .innerJoin(books, eq(bookCopies.bookId, books.id))
      .where(eq(bookCopies.barcode, cleanBarcode))
      .limit(1);

    if (rows.length === 0) return null;
    const { copy, book } = rows[0];

    let location = 'Unassigned';
    if (copy.shelfId) {
      const shelf = await ShelvingService.getShelfLocation(copy.shelfId);
      if (shelf) location = shelf.formattedLocation;
    }

    return {
      id: copy.id,
      bookId: copy.bookId,
      bookTitle: book.title,
      bookIsbn: book.isbn,
      barcode: copy.barcode,
      qrCode: copy.qrCode,
      accessionNumber: copy.accessionNumber,
      shelfId: copy.shelfId,
      shelfLocation: location,
      condition: copy.condition,
      status: copy.status,
      price: copy.price,
      acquisitionDate: new Date(copy.acquisitionDate),
      notes: copy.notes,
    };
  }

  static async createCopy(params: {
    bookId: string;
    barcode?: string;
    accessionNumber?: string;
    shelfId?: string | null;
    condition?: string;
    price?: number;
    notes?: string;
    actorId: string;
  }): Promise<BookCopyDetail> {
    await initPromise;

    // Check book existence
    const bookRows = await db.select().from(books).where(eq(books.id, params.bookId)).limit(1);
    if (bookRows.length === 0) {
      throw new Error('Associated book not found');
    }

    // Auto-generate barcode & accession number if not provided
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const barcode = params.barcode?.trim() || `BC-${randomSuffix}`;
    const accessionNumber = params.accessionNumber?.trim() || `ACC-2026-${randomSuffix}`;

    // Generate real QR Code data URL containing copy identifier and barcode
    const qrPayload = JSON.stringify({
      barcode,
      accessionNumber,
      bookId: params.bookId,
      type: 'LIBRARY_ITEM',
    });
    const qrCode = await QRCode.toDataURL(qrPayload, { margin: 1, width: 250 });

    const [created] = await db
      .insert(bookCopies)
      .values({
        bookId: params.bookId,
        barcode,
        qrCode,
        accessionNumber,
        shelfId: params.shelfId || null,
        condition: params.condition || 'GOOD',
        status: 'AVAILABLE',
        price: params.price ? params.price.toFixed(2) : '29.99',
        notes: params.notes || null,
      })
      .returning();

    // Record inventory transaction
    await db.insert(inventoryTransactions).values({
      copyId: created.id,
      performedBy: params.actorId,
      transactionType: 'INTAKE',
      newStatus: 'AVAILABLE',
      newShelfId: created.shelfId,
      notes: `New copy intake: ${accessionNumber}`,
    });

    await AuditService.log({
      actorId: params.actorId,
      action: 'BOOK_COPY_CREATE',
      entityType: 'BOOK_COPY',
      entityId: created.id,
      metadata: { barcode, accessionNumber, bookId: params.bookId },
    });

    return {
      id: created.id,
      bookId: created.bookId,
      barcode: created.barcode,
      qrCode: created.qrCode,
      accessionNumber: created.accessionNumber,
      shelfId: created.shelfId,
      condition: created.condition,
      status: created.status,
      price: created.price,
      acquisitionDate: new Date(created.acquisitionDate),
      notes: created.notes,
    };
  }

  static async updateStatus(params: {
    copyId: string;
    newStatus: string;
    shelfId?: string | null;
    notes?: string;
    actorId: string;
  }): Promise<void> {
    await initPromise;
    const [existing] = await db.select().from(bookCopies).where(eq(bookCopies.id, params.copyId)).limit(1);
    if (!existing) {
      throw new Error('Book copy not found');
    }

    await db
      .update(bookCopies)
      .set({
        status: params.newStatus,
        shelfId: params.shelfId !== undefined ? params.shelfId : existing.shelfId,
        notes: params.notes || existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(bookCopies.id, params.copyId));

    await db.insert(inventoryTransactions).values({
      copyId: params.copyId,
      performedBy: params.actorId,
      transactionType: 'STATUS_CHANGE',
      previousStatus: existing.status,
      newStatus: params.newStatus,
      previousShelfId: existing.shelfId,
      newShelfId: params.shelfId !== undefined ? params.shelfId : existing.shelfId,
      notes: params.notes || `Status transition from ${existing.status} to ${params.newStatus}`,
    });

    await AuditService.log({
      actorId: params.actorId,
      action: 'BOOK_COPY_STATUS_CHANGE',
      entityType: 'BOOK_COPY',
      entityId: params.copyId,
      metadata: { from: existing.status, to: params.newStatus, notes: params.notes },
    });
  }
}
