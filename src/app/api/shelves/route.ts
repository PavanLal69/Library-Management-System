import { ShelvingService } from '@/server/services/ShelvingService';
import { apiSuccess, apiError } from '@/server/lib/api-response';

export async function GET() {
  try {
    const shelves = await ShelvingService.getAllShelves();
    return apiSuccess(shelves);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch shelves';
    return apiError('SHELVES_FETCH_FAILED', message, 500);
  }
}
