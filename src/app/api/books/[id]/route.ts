import { NextRequest } from 'next/server';
import { BookService } from '@/server/services/BookService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const book = await BookService.getBookById(id);
    if (!book) {
      return apiError('BOOK_NOT_FOUND', 'The requested book was not found', 404);
    }
    return apiSuccess(book);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch book';
    return apiError('FETCH_FAILED', message, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(PERMISSIONS.BOOK_UPDATE);
    const { id } = await params;
    const body = await req.json();

    const updated = await BookService.updateBook(id, body, session.id);
    return apiSuccess(updated, { message: 'Book updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update book';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('BOOK_UPDATE_FAILED', message, status);
  }
}
