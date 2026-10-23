import { eq } from 'drizzle-orm';

import { db } from './client';
import { settings } from './schema';

export const SETTING_KEYS = {
  periodStart: 'period_start_date',
  currency: 'currency',
  reminderTime: 'reminder_time',
  reminderEnabled: 'reminder_enabled',
  reminderNotificationId: 'reminder_notification_id',
  lastCategory: 'last_category_id',
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

export async function getPeriodStart(): Promise<string | null> {
  return getSetting(SETTING_KEYS.periodStart);
}
