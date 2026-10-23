import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const NEED_WANT = ['need', 'want'] as const;
export type NeedWant = (typeof NEED_WANT)[number];

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
  icon: text('icon'),
  color: text('color'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
});

export const recurringRules = sqliteTable('recurring_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
  amount: integer('amount').notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  note: text('note'),
  needWant: text('need_want', { enum: NEED_WANT }),
  dayOfMonth: integer('day_of_month').notNull(),
  startDate: text('start_date').notNull(),
  lastRunDate: text('last_run_date'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
    amount: integer('amount').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    note: text('note'),
    date: text('date').notNull(),
    needWant: text('need_want', { enum: NEED_WANT }),
    receiptUri: text('receipt_uri'),
    recurringId: integer('recurring_id').references(() => recurringRules.id),
    recurringDate: text('recurring_date'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_tx_date').on(table.date),
    index('idx_tx_category').on(table.categoryId),
    uniqueIndex('idx_tx_recurring').on(table.recurringId, table.recurringDate),
  ],
);

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').references(() => categories.id),
  amount: integer('amount').notNull(),
  periodIndex: integer('period_index'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(),
  savedAmount: integer('saved_amount').notNull().default(0),
  deadline: text('deadline'),
  color: text('color'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type NewRecurringRule = typeof recurringRules.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
