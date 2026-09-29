import { NextRequest } from 'next/server';
import { BookCopyService } from '@/server/services/BookCopyService';
import { apiSuccess, apiError } from '@/server/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ barcode: string }> }) {
  try {
    const { barcode } = await params;
    const copy = await BookCopyService.getCopyByBarcode(barcode);
    if (!copy) {
      return apiError('COPY_NOT_FOUND', `No physical copy found with barcode ${barcode}`, 404);
    }
    return apiSuccess(copy);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    return apiError('LOOKUP_FAILED', message, 500);
  }
}
