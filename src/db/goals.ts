import { asc, desc, eq, sql } from 'drizzle-orm';

import { db } from './client';
import { goals, type Goal, type NewGoal } from './schema';

export type GoalInput = {
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  color: string | null;
};

export async function listGoals(includeArchived = false): Promise<Goal[]> {
  return db
    .select()
    .from(goals)
    .where(includeArchived ? undefined : eq(goals.isArchived, false))
    .orderBy(asc(goals.isArchived), desc(goals.createdAt), desc(goals.id));
}

export async function createGoal(input: GoalInput): Promise<void> {
  await db.insert(goals).values(input satisfies NewGoal);
}

export async function updateGoal(id: number, input: GoalInput): Promise<void> {
  await db.update(goals).set(input).where(eq(goals.id, id));
}

export async function addGoalFunds(id: number, amount: number): Promise<void> {
  await db
    .update(goals)
    .set({ savedAmount: sql`${goals.savedAmount} + ${amount}` })
    .where(eq(goals.id, id));
}

export async function deleteGoal(id: number): Promise<void> {
  await db.delete(goals).where(eq(goals.id, id));
}
