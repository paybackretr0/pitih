import { sql } from 'drizzle-orm';

import { db } from './client';
import { categories, type NewCategory } from './schema';
import { getSetting, SETTING_KEYS, setSetting } from './settings';
import { todayISO } from '@/lib/format';
import { colors } from '@/theme';

const DEFAULT_CATEGORIES: NewCategory[] = [
  { name: 'Makan & Minum', type: 'expense', icon: '🍜', color: colors.yellow },
  { name: 'Transport', type: 'expense', icon: '🛵', color: colors.blue },
  { name: 'Belanja', type: 'expense', icon: '🛍️', color: colors.pink },
  { name: 'Tagihan', type: 'expense', icon: '🧾', color: colors.orange },
  { name: 'Hiburan', type: 'expense', icon: '🎬', color: colors.purple },
  { name: 'Kesehatan', type: 'expense', icon: '🩺', color: colors.green },
  { name: 'Pendidikan', type: 'expense', icon: '📚', color: colors.blue },
  { name: 'Langganan', type: 'expense', icon: '📱', color: colors.pink },
  { name: 'Lainnya', type: 'expense', icon: '📦', color: colors.orange },
  { name: 'Gaji', type: 'income', icon: '💰', color: colors.green },
  { name: 'Bonus', type: 'income', icon: '🎁', color: colors.yellow },
  { name: 'Usaha', type: 'income', icon: '🏪', color: colors.blue },
  { name: 'Hadiah', type: 'income', icon: '🎉', color: colors.pink },
  { name: 'Lainnya', type: 'income', icon: '➕', color: colors.green },
];

export async function seedDatabase(): Promise<void> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(categories);
  if (Number(row?.count ?? 0) === 0) {
    await db.insert(categories).values(DEFAULT_CATEGORIES.map((item) => ({ ...item, isDefault: true })));
  }

  if (!(await getSetting(SETTING_KEYS.periodStart))) {
    await setSetting(SETTING_KEYS.periodStart, todayISO());
  }
  if (!(await getSetting(SETTING_KEYS.currency))) {
    await setSetting(SETTING_KEYS.currency, 'IDR');
  }
  if (!(await getSetting(SETTING_KEYS.reminderTime))) {
    await setSetting(SETTING_KEYS.reminderTime, '20:00');
  }
}
