export type BudgetWarningLevel = "warning" | "over";

export type CategorySpend = {
  categoryId: number;
  name: string;
  total: number;
};

export type CategoryBudgetWarning = {
  categoryId: number;
  name: string;
  spent: number;
  budget: number;
  percent: number;
  level: BudgetWarningLevel;
};

/**
 * The brief asks for a shout at 80% and a louder one at 100%. Categories
 * without a budget stay quiet, and the loudest warning comes first.
 */
export function categoryBudgetWarnings(
  spends: CategorySpend[],
  budgets: Record<number, number>,
): CategoryBudgetWarning[] {
  const warnings: CategoryBudgetWarning[] = [];

  for (const spend of spends) {
    const budget = budgets[spend.categoryId];
    if (!budget || budget <= 0) continue;

    const ratio = spend.total / budget;
    if (ratio < 0.8) continue;

    warnings.push({
      categoryId: spend.categoryId,
      name: spend.name,
      spent: spend.total,
      budget,
      percent: Math.round(ratio * 100),
      level: ratio >= 1 ? "over" : "warning",
    });
  }

  return warnings.sort((left, right) => right.percent - left.percent);
}
