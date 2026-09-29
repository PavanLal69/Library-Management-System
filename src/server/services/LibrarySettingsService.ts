import { db, initPromise } from '../db';
import { librarySettings } from '../db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_SETTINGS: Record<string, string> = {
  LOAN_PERIOD_DAYS: '14',
  MAX_RENEWALS: '2',
  DAILY_FINE_RATE: '0.50',
  MAX_OVERDUE_FINE: '25.00',
  GRACE_PERIOD_DAYS: '1',
  RESERVATION_PICKUP_HOURS: '48',
  DEFAULT_BORROW_LIMIT: '5',
  LIBRARY_NAME: 'Central Metropolitan University Library',
  LIBRARY_CONTACT_EMAIL: 'circulation@library.edu',
  OPENING_HOURS: 'Mon-Fri: 08:00 - 22:00, Sat-Sun: 09:00 - 18:00',
};

export class LibrarySettingsService {
  static async getSetting(key: string, fallback?: string): Promise<string> {
    await initPromise;
    const [row] = await db.select().from(librarySettings).where(eq(librarySettings.key, key)).limit(1);
    if (row) return row.value;
    return fallback ?? DEFAULT_SETTINGS[key] ?? '';
  }

  static async getNumberSetting(key: string, fallback?: number): Promise<number> {
    const val = await this.getSetting(key);
    const parsed = parseFloat(val);
    return isNaN(parsed) ? (fallback ?? 0) : parsed;
  }

  static async getAllSettings(): Promise<Record<string, string>> {
    await initPromise;
    const rows = await db.select().from(librarySettings);
    const result = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  static async updateSetting(key: string, value: string): Promise<void> {
    await initPromise;
    const [existing] = await db.select().from(librarySettings).where(eq(librarySettings.key, key)).limit(1);
    if (existing) {
      await db
        .update(librarySettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(librarySettings.key, key));
    } else {
      await db.insert(librarySettings).values({
        key,
        value,
        description: `Configured system setting for ${key}`,
      });
    }
  }
}
