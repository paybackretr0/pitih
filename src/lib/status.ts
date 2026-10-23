export type StatusLevel = 'aman' | 'hati-hati' | 'boros';

export type BudgetStatus = {
  level: StatusLevel;
  spentPct: number;
  pace: number;
};

export const statusLabel: Record<StatusLevel, string> = {
  aman: 'AMAN',
  'hati-hati': 'HATI-HATI',
  boros: 'BOROS',
};

/**
 * Spending is compared against time elapsed, so a budget that is 50% used on
 * day 10 of 30 reads as fast spending, not as success.
 */
export function budgetStatus(
  spent: number,
  budget: number | null,
  daysLeft: number,
  periodLength = 30,
): BudgetStatus | null {
  if (!budget || budget <= 0) return null;

  const spentPct = spent / budget;
  const elapsed = daysLeft <= 0 ? periodLength : Math.min(periodLength, periodLength - daysLeft + 1);
  const elapsedPct = Math.max(elapsed / periodLength, 0.01);
  const pace = spentPct / elapsedPct;

  const level: StatusLevel = spentPct >= 1 ? 'boros' : pace > 1.15 ? 'hati-hati' : 'aman';
  return { level, spentPct, pace };
}

export function dailyAllowance(budget: number | null, spent: number, daysLeft: number): number | null {
  if (!budget || budget <= 0) return null;
  if (daysLeft <= 0) return 0;
  return Math.max(0, Math.floor((budget - spent) / daysLeft));
}
