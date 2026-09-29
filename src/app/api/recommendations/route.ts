import { RecommendationService } from '@/server/services/RecommendationService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { getAuthSession } from '@/server/lib/auth-session';

export async function GET() {
  try {
    const session = await getAuthSession();
    const memberId = session?.memberProfile?.id || '';

    const recommendations = await RecommendationService.getRecommendationsForMember(memberId, 8);
    return apiSuccess(recommendations);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate recommendations';
    return apiError('RECOMMENDATIONS_FAILED', message, 500);
  }
}
