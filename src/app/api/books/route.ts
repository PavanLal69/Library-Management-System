import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BookService } from '@/server/services/BookService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

const createBookSchema = z.object({
  isbn: z.string().min(10, 'ISBN must be at least 10 characters'),
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  publicationYear: z.number().int().optional(),
  edition: z.string().optional(),
  pages: z.number().int().optional(),
  coverImageUrl: z.string().optional(),
  publisherId: z.string().uuid().optional(),
  languageId: z.string().uuid().optional(),
  authorIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  initialCopiesCount: z.number().int().min(0).max(20).optional(),
  initialShelfId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || undefined;
    const categoryId = searchParams.get('category') || undefined;
    const authorId = searchParams.get('author') || undefined;
    const availableOnly = searchParams.get('available') === 'true';
    const sortBy = (searchParams.get('sort') as 'relevance' | 'title' | 'year' | 'availability') || 'relevance';
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const results = await BookService.searchBooks({
      query,
      categoryId,
      authorId,
      availableOnly,
      sortBy,
      page,
      limit,
    });

    return apiSuccess(results.books, { pagination: results.pagination });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to search books';
    return apiError('BOOK_SEARCH_FAILED', message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.BOOK_CREATE);
    const body = await req.json();
    const validated = createBookSchema.parse(body);

    const created = await BookService.createBook(validated, session.id);
    return apiSuccess(created, { message: 'Book created successfully' }, 201);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Validation error', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Failed to create book';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('BOOK_CREATE_FAILED', message, status);
  }
}
