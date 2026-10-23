import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { db } from './client';
import { categories, recurringRules, transactions } from './schema';
import type { NeedWant, TransactionType } from './schema';
import { dueRecurringDates } from '@/features/recurring/recurring';

export type RecurringInput = {
  type: TransactionType;
  amount: number;
  categoryId: number;
  note: string | null;
  needWant: NeedWant | null;
  dayOfMonth: number;
  startDate: string;
};

export type RecurringListItem = {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number;
  note: string | null;
  needWant: NeedWant | null;
  dayOfMonth: number;
  startDate: string;
  lastRunDate: string | null;
  isActive: boolean;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
};

export async function listRecurringRules(): Promise<RecurringListItem[]> {
  return db
    .select({
      id: recurringRules.id,
      type: recurringRules.type,
      amount: recurringRules.amount,
      categoryId: recurringRules.categoryId,
      note: recurringRules.note,
      needWant: recurringRules.needWant,
      dayOfMonth: recurringRules.dayOfMonth,
      startDate: recurringRules.startDate,
      lastRunDate: recurringRules.lastRunDate,
      isActive: recurringRules.isActive,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(recurringRules)
    .innerJoin(categories, eq(categories.id, recurringRules.categoryId))
    .orderBy(desc(recurringRules.isActive), asc(recurringRules.dayOfMonth), asc(recurringRules.id));
}

export async function getRecurringRule(id: number) {
  const rows = await db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createRecurringRule(input: RecurringInput): Promise<void> {
  await db.insert(recurringRules).values(input);
}

export async function updateRecurringRule(
  id: number,
  input: RecurringInput,
  today: string,
): Promise<void> {
  const existing = await getRecurringRule(id);
  const scheduleChanged =
    !existing ||
    existing.dayOfMonth !== input.dayOfMonth ||
    existing.startDate !== input.startDate;

  await db
    .update(recurringRules)
    .set({
      ...input,
      // A moved schedule starts from today, so the old and new dates cannot
      // both fire in the same month.
      ...(scheduleChanged ? { lastRunDate: today } : {}),
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(recurringRules.id, id));
}

export async function setRecurringActive(
  id: number,
  active: boolean,
  today: string,
): Promise<void> {
  await db
    .update(recurringRules)
    .set({
      isActive: active,
      // Resuming starts from today, so months spent paused are not backfilled.
      ...(active ? { lastRunDate: today } : {}),
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(recurringRules.id, id));
}

/** Keeps generated transactions and turns them into normal history rows. */
export async function deleteRecurringRule(id: number): Promise<void> {
  db.transaction((tx) => {
    tx.update(transactions)
      .set({ recurringId: null, recurringDate: null })
      .where(eq(transactions.recurringId, id))
      .run();
    tx.delete(recurringRules).where(eq(recurringRules.id, id)).run();
  });
}

/**
 * Fills in every monthly transaction that is due but not generated yet. The
 * unique index on (recurring_id, recurring_date) makes this safe to run on
 * every launch, even if two runs overlap.
 */
export async function processRecurring(today: string): Promise<number> {
  const active = await db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.isActive, true));

  let generated = 0;

  for (const rule of active) {
    const dates = dueRecurringDates(
      {
        dayOfMonth: rule.dayOfMonth,
        startDate: rule.startDate,
        lastRunDate: rule.lastRunDate,
        isActive: rule.isActive,
      },
      today,
    );
    if (dates.length === 0) continue;

    const lastDate = dates[dates.length - 1];
    db.transaction((tx) => {
      for (const date of dates) {
        tx.insert(transactions)
          .values({
            type: rule.type,
            amount: rule.amount,
            categoryId: rule.categoryId,
            note: rule.note,
            date,
            needWant: rule.needWant,
            recurringId: rule.id,
            recurringDate: date,
          })
          .onConflictDoNothing()
          .run();
      }
      tx.update(recurringRules)
        .set({ lastRunDate: lastDate, updatedAt: sql`(datetime('now'))` })
        .where(and(eq(recurringRules.id, rule.id), eq(recurringRules.isActive, true)))
        .run();
    });

    generated += dates.length;
  }

  return generated;
}
