import { categoryBudgetWarnings } from '@/lib/budget-warnings';

const budgets = { 1: 100000, 2: 50000, 3: 200000 };

describe('categoryBudgetWarnings', () => {
  it('stays quiet below 80 percent', () => {
    expect(
      categoryBudgetWarnings([{ categoryId: 1, name: 'Makan', total: 79999 }], budgets),
    ).toEqual([]);
  });

  it('warns from 80 percent up to 99 percent', () => {
    const [warning] = categoryBudgetWarnings(
      [{ categoryId: 1, name: 'Makan', total: 80000 }],
      budgets,
    );
    expect(warning).toMatchObject({
      categoryId: 1,
      name: 'Makan',
      spent: 80000,
      budget: 100000,
      percent: 80,
      level: 'warning',
    });
  });

  it('marks the 100 percent line as over budget', () => {
    const [warning] = categoryBudgetWarnings(
      [{ categoryId: 1, name: 'Makan', total: 100000 }],
      budgets,
    );
    expect(warning.level).toBe('over');
    expect(warning.percent).toBe(100);
  });

  it('keeps counting past 100 percent', () => {
    const [warning] = categoryBudgetWarnings(
      [{ categoryId: 2, name: 'Transport', total: 75000 }],
      budgets,
    );
    expect(warning.percent).toBe(150);
    expect(warning.level).toBe('over');
  });

  it('ignores categories without a budget or with a zero budget', () => {
    expect(
      categoryBudgetWarnings(
        [
          { categoryId: 1, name: 'Makan', total: 900000 },
          { categoryId: 9, name: 'Tanpa budget', total: 900000 },
        ],
        { ...budgets, 1: 0 },
      ),
    ).toEqual([]);
  });

  it('sorts the loudest warning first', () => {
    const warnings = categoryBudgetWarnings(
      [
        { categoryId: 1, name: 'Makan', total: 85000 },
        { categoryId: 2, name: 'Transport', total: 60000 },
        { categoryId: 3, name: 'Hiburan', total: 210000 },
      ],
      budgets,
    );

    expect(warnings.map((warning) => warning.name)).toEqual([
      'Transport',
      'Hiburan',
      'Makan',
    ]);
  });
});
