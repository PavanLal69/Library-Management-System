import { NextRequest } from 'next/server';
import { z } from 'zod';
import { LibrarySettingsService } from '@/server/services/LibrarySettingsService';
import { apiSuccess, apiError } from '@/server/lib/api-response';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';
import { AuditService } from '@/server/services/AuditService';

const updateSettingsSchema = z.record(z.string(), z.string());

export async function GET() {
  try {
    await requireAuth(PERMISSIONS.SYSTEM_SETTINGS);
    const settings = await LibrarySettingsService.getAllSettings();
    return apiSuccess(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch settings';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return apiError('SETTINGS_FETCH_FAILED', message, status);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(PERMISSIONS.SYSTEM_SETTINGS);
    const body = await req.json();
    const validated = updateSettingsSchema.parse(body);

    for (const [key, value] of Object.entries(validated)) {
      await LibrarySettingsService.updateSetting(key, value);
    }

    await AuditService.log({
      actorId: session.id,
      action: 'SYSTEM_SETTINGS_UPDATE',
      entityType: 'SETTINGS',
      metadata: validated,
    });

    const updated = await LibrarySettingsService.getAllSettings();
    return apiSuccess(updated, { message: 'Settings successfully updated' });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return apiError('VALIDATION_ERROR', err.issues[0]?.message || 'Invalid input', 422, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Failed to update settings';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 400;
    return apiError('SETTINGS_UPDATE_FAILED', message, status);
  }
}
