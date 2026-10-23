import { differenceInCalendarDays, parseISO } from 'date-fns';

/** Capped at 100 so the bar never overflows, while the text can show the truth. */
export function goalProgressPercent(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((saved / target) * 100)));
}

export function goalRemaining(saved: number, target: number): number {
  return Math.max(0, target - saved);
}

/** Negative means the deadline has passed. Null means no deadline. */
export function goalDaysLeft(deadline: string | null, today: string): number | null {
  if (!deadline) return null;
  const end = parseISO(deadline);
  const start = parseISO(today);
  if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) return null;
  return differenceInCalendarDays(end, start);
}

export function isGoalReached(saved: number, target: number): boolean {
  return target > 0 && saved >= target;
}

export type GoalAmounts = {
  savedAmount: number;
  targetAmount: number;
};

export type GoalTotals = {
  count: number;
  reachedCount: number;
  totalSaved: number;
  totalTarget: number;
  totalRemaining: number;
  percent: number;
};

/** Totals for the savings summary, with each goal's leftover capped at zero. */
export function goalTotals(goals: readonly GoalAmounts[]): GoalTotals {
  let totalSaved = 0;
  let totalTarget = 0;
  let totalRemaining = 0;
  let reachedCount = 0;

  for (const goal of goals) {
    totalSaved += goal.savedAmount;
    totalTarget += goal.targetAmount;
    totalRemaining += goalRemaining(goal.savedAmount, goal.targetAmount);
    if (isGoalReached(goal.savedAmount, goal.targetAmount)) reachedCount += 1;
  }

  return {
    count: goals.length,
    reachedCount,
    totalSaved,
    totalTarget,
    totalRemaining,
    percent: goalProgressPercent(totalSaved, totalTarget),
  };
}
