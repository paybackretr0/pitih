import { asc, eq } from "drizzle-orm";

import type { BackupPayload } from "@/features/backup/backup-format";
import type { CsvTransaction } from "@/features/backup/csv";
import { db } from "./client";
import {
  budgets,
  categories,
  checkins,
  goals,
  recurringRules,
  settings,
  transactions,
} from "./schema";

function chunk<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

export async function readBackupPayload(): Promise<BackupPayload> {
  const [
    categoryRows,
    transactionRows,
    budgetRows,
    settingRows,
    recurringRows,
    goalRows,
    checkinRows,
  ] = await Promise.all([
    db.select().from(categories),
    db.select().from(transactions),
    db.select().from(budgets),
    db.select().from(settings),
    db.select().from(recurringRules),
    db.select().from(goals),
    db.select().from(checkins),
  ]);

  return {
    categories: categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      icon: row.icon,
      color: row.color,
      isDefault: row.isDefault,
      isArchived: row.isArchived,
    })),
    transactions: transactionRows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      categoryId: row.categoryId,
      note: row.note,
      date: row.date,
      needWant: row.needWant,
      receiptUri: row.receiptUri,
      recurringId: row.recurringId,
      recurringDate: row.recurringDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    budgets: budgetRows.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      amount: row.amount,
      periodIndex: row.periodIndex,
    })),
    settings: settingRows.map((row) => ({ key: row.key, value: row.value })),
    recurring: recurringRows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      categoryId: row.categoryId,
      note: row.note,
      needWant: row.needWant,
      dayOfMonth: row.dayOfMonth,
      startDate: row.startDate,
      lastRunDate: row.lastRunDate,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    goals: goalRows.map((row) => ({
      id: row.id,
      name: row.name,
      targetAmount: row.targetAmount,
      savedAmount: row.savedAmount,
      deadline: row.deadline,
      color: row.color,
      isArchived: row.isArchived,
      createdAt: row.createdAt,
    })),
    checkins: checkinRows.map((row) => ({
      id: row.id,
      weekStart: row.weekStart,
      expense: row.expense,
      income: row.income,
      daysLogged: row.daysLogged,
      status: row.status,
      createdAt: row.createdAt,
    })),
  };
}

export async function readTransactionsForCsv(): Promise<CsvTransaction[]> {
  return db
    .select({
      date: transactions.date,
      type: transactions.type,
      categoryName: categories.name,
      amount: transactions.amount,
      needWant: transactions.needWant,
      note: transactions.note,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .orderBy(asc(transactions.date), asc(transactions.id));
}

/**
 * Restore replaces everything in one SQLite transaction, so a failure halfway
 * through leaves the previous data untouched. Chunking keeps the number of SQL
 * variables under SQLite's limit on long histories.
 */
export async function replaceBackupPayload(
  payload: BackupPayload,
): Promise<void> {
  db.transaction((tx) => {
    tx.delete(transactions).run();
    tx.delete(budgets).run();
    tx.delete(recurringRules).run();
    tx.delete(goals).run();
    tx.delete(checkins).run();
    tx.delete(categories).run();
    tx.delete(settings).run();

    for (const rows of chunk(payload.categories, 100)) {
      tx.insert(categories).values(rows).run();
    }
    for (const rows of chunk(payload.recurring, 100)) {
      tx.insert(recurringRules).values(rows).run();
    }
    for (const rows of chunk(payload.transactions, 100)) {
      tx.insert(transactions).values(rows).run();
    }
    for (const rows of chunk(payload.budgets, 100)) {
      tx.insert(budgets).values(rows).run();
    }
    for (const rows of chunk(payload.goals, 100)) {
      tx.insert(goals).values(rows).run();
    }
    for (const rows of chunk(payload.checkins, 100)) {
      tx.insert(checkins).values(rows).run();
    }
    for (const rows of chunk(payload.settings, 100)) {
      tx.insert(settings).values(rows).run();
    }
  });
}
