import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import { db } from "./client";
import {
  budgets,
  categories,
  checkins,
  settings,
  transactions,
  type NeedWant,
  type Transaction,
  type TransactionType,
} from "./schema";

export type DateRange = { start: string; end: string };

export type TransactionListItem = {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  needWant: NeedWant | null;
  receiptUri: string | null;
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
};

export type PeriodSummary = {
  income: number;
  expense: number;
  need: number;
  want: number;
  untagged: number;
};

function inRange(range: DateRange) {
  return and(
    gte(transactions.date, range.start),
    lte(transactions.date, range.end),
  );
}

export async function listTransactions(
  range: DateRange,
  typeFilter?: TransactionType,
): Promise<TransactionListItem[]> {
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      needWant: transactions.needWant,
      receiptUri: transactions.receiptUri,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      typeFilter
        ? and(inRange(range), eq(transactions.type, typeFilter))
        : inRange(range),
    )
    .orderBy(desc(transactions.date), desc(transactions.id));
}

export async function getPeriodSummary(
  range: DateRange,
): Promise<PeriodSummary> {
  const rows = await db
    .select({
      type: transactions.type,
      needWant: transactions.needWant,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(inRange(range))
    .groupBy(transactions.type, transactions.needWant);

  const summary: PeriodSummary = {
    income: 0,
    expense: 0,
    need: 0,
    want: 0,
    untagged: 0,
  };
  for (const row of rows) {
    const total = Number(row.total);
    if (row.type === "income") {
      summary.income += total;
      continue;
    }
    summary.expense += total;
    if (row.needWant === "need") summary.need += total;
    else if (row.needWant === "want") summary.want += total;
    else summary.untagged += total;
  }
  return summary;
}

export async function getTopExpenses(range: DateRange, limit = 5) {
  return db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      note: transactions.note,
      date: transactions.date,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(inRange(range), eq(transactions.type, "expense")))
    .orderBy(desc(transactions.amount), desc(transactions.id))
    .limit(limit);
}

export async function getCategoryTotals(range: DateRange) {
  return db
    .select({
      categoryId: categories.id,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(inRange(range), eq(transactions.type, "expense")))
    .groupBy(categories.id, categories.name, categories.icon, categories.color)
    .orderBy(desc(sql`coalesce(sum(${transactions.amount}), 0)`));
}

export async function getDailyExpenses(range: DateRange) {
  return db
    .select({
      date: transactions.date,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(and(inRange(range), eq(transactions.type, "expense")))
    .groupBy(transactions.date)
    .orderBy(asc(transactions.date));
}

export async function getLoggedDays(range: DateRange): Promise<number> {
  const rows = await db
    .select({ date: transactions.date })
    .from(transactions)
    .where(inRange(range))
    .groupBy(transactions.date);
  return rows.length;
}

export async function getSpentOn(date: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.type, "expense"), eq(transactions.date, date)));
  return Number(row?.total ?? 0);
}

export async function listCategories(
  typeFilter?: TransactionType,
  includeArchived = false,
) {
  const conditions = [];
  if (typeFilter) conditions.push(eq(categories.type, typeFilter));
  if (!includeArchived) conditions.push(eq(categories.isArchived, false));

  return db
    .select()
    .from(categories)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(categories.type), asc(categories.name));
}

export async function createCategory(input: {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}) {
  await db.insert(categories).values(input);
}

export async function updateCategory(
  id: number,
  input: { name: string; icon: string; color: string },
) {
  await db.update(categories).set(input).where(eq(categories.id, id));
}

export async function setCategoryArchived(id: number, archived: boolean) {
  await db
    .update(categories)
    .set({ isArchived: archived })
    .where(eq(categories.id, id));
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  categoryId: number;
  note: string | null;
  date: string;
  needWant: NeedWant | null;
  receiptUri: string | null;
}) {
  await db.insert(transactions).values(input);
}

export async function updateTransaction(
  id: number,
  input: {
    type: TransactionType;
    amount: number;
    categoryId: number;
    note: string | null;
    date: string;
    needWant: NeedWant | null;
    receiptUri: string | null;
  },
) {
  await db
    .update(transactions)
    .set({ ...input, updatedAt: sql`(datetime('now'))` })
    .where(eq(transactions.id, id));
}

export async function deleteTransaction(id: number) {
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function getTotalBudget(
  periodIndex: number,
): Promise<number | null> {
  const rows = await db
    .select()
    .from(budgets)
    .where(isNull(budgets.categoryId));
  const fallback = rows.find((row) => row.periodIndex === null);
  const specific = rows.find((row) => row.periodIndex === periodIndex);
  return (specific ?? fallback)?.amount ?? null;
}

export async function getCategoryBudgets(
  periodIndex: number,
): Promise<Record<number, number>> {
  const rows = await db
    .select()
    .from(budgets)
    .where(isNotNull(budgets.categoryId));
  const result: Record<number, number> = {};
  for (const row of rows) {
    if (row.categoryId === null) continue;
    if (row.periodIndex === null) result[row.categoryId] = row.amount;
  }
  for (const row of rows) {
    if (row.categoryId === null) continue;
    if (row.periodIndex === periodIndex) result[row.categoryId] = row.amount;
  }
  return result;
}

export type BudgetSet = {
  total: number | null;
  categories: Record<number, number>;
};

/** Raw budget rows for one scope: null reads the default, a number reads that period. */
export async function getBudgets(
  periodIndex: number | null,
): Promise<BudgetSet> {
  const rows = await db
    .select()
    .from(budgets)
    .where(
      periodIndex === null
        ? isNull(budgets.periodIndex)
        : eq(budgets.periodIndex, periodIndex),
    );
  const set: BudgetSet = { total: null, categories: {} };
  for (const row of rows) {
    if (row.categoryId === null) set.total = row.amount;
    else set.categories[row.categoryId] = row.amount;
  }
  return set;
}

export async function setTotalBudget(
  amount: number | null,
  periodIndex: number | null = null,
) {
  await db
    .delete(budgets)
    .where(
      and(
        isNull(budgets.categoryId),
        periodIndex === null
          ? isNull(budgets.periodIndex)
          : eq(budgets.periodIndex, periodIndex),
      ),
    );
  if (amount !== null && amount > 0) {
    await db.insert(budgets).values({ categoryId: null, amount, periodIndex });
  }
}

export async function setCategoryBudget(
  categoryId: number,
  amount: number | null,
  periodIndex: number | null = null,
) {
  await db
    .delete(budgets)
    .where(
      and(
        eq(budgets.categoryId, categoryId),
        periodIndex === null
          ? isNull(budgets.periodIndex)
          : eq(budgets.periodIndex, periodIndex),
      ),
    );
  if (amount !== null && amount > 0) {
    await db.insert(budgets).values({ categoryId, amount, periodIndex });
  }
}

export async function resetAllData() {
  await db.delete(transactions);
  await db.delete(budgets);
  await db.delete(categories);
  await db.delete(settings);
  await db.delete(checkins);
}
