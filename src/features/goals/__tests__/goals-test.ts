import {
  goalDaysLeft,
  goalProgressPercent,
  goalRemaining,
  goalTotals,
  isGoalReached,
} from '@/features/goals/goals';

describe('goalProgressPercent', () => {
  it('rounds progress to a whole percent', () => {
    expect(goalProgressPercent(500000, 1000000)).toBe(50);
    expect(goalProgressPercent(333000, 1000000)).toBe(33);
  });

  it('caps at 100 and never goes below zero', () => {
    expect(goalProgressPercent(1500000, 1000000)).toBe(100);
    expect(goalProgressPercent(-500, 1000000)).toBe(0);
  });

  it('returns zero for a missing target', () => {
    expect(goalProgressPercent(1000, 0)).toBe(0);
  });
});

describe('goalRemaining', () => {
  it('counts what is still needed', () => {
    expect(goalRemaining(400000, 1000000)).toBe(600000);
  });

  it('does not go negative when the goal is passed', () => {
    expect(goalRemaining(1200000, 1000000)).toBe(0);
  });
});

describe('goalDaysLeft', () => {
  it('counts calendar days to the deadline', () => {
    expect(goalDaysLeft('2026-11-22', '2026-10-23')).toBe(30);
    expect(goalDaysLeft('2026-10-23', '2026-10-23')).toBe(0);
  });

  it('returns a negative number when the deadline passed', () => {
    expect(goalDaysLeft('2026-10-01', '2026-10-23')).toBe(-22);
  });

  it('returns null without a deadline', () => {
    expect(goalDaysLeft(null, '2026-10-23')).toBeNull();
  });
});

describe('isGoalReached', () => {
  it('is true only with a real target that has been met', () => {
    expect(isGoalReached(1000000, 1000000)).toBe(true);
    expect(isGoalReached(999999, 1000000)).toBe(false);
    expect(isGoalReached(0, 0)).toBe(false);
  });
});

describe('goalTotals', () => {
  it('adds up saved, target, and leftover for every goal', () => {
    expect(
      goalTotals([
        { savedAmount: 400000, targetAmount: 1000000 },
        { savedAmount: 250000, targetAmount: 500000 },
      ]),
    ).toEqual({
      count: 2,
      reachedCount: 0,
      totalSaved: 650000,
      totalTarget: 1500000,
      totalRemaining: 850000,
      percent: 43,
    });
  });

  it('counts reached goals and does not subtract an overspent target', () => {
    expect(
      goalTotals([
        { savedAmount: 1200000, targetAmount: 1000000 },
        { savedAmount: 0, targetAmount: 500000 },
      ]),
    ).toEqual({
      count: 2,
      reachedCount: 1,
      totalSaved: 1200000,
      totalTarget: 1500000,
      totalRemaining: 500000,
      percent: 80,
    });
  });

  it('returns an empty summary when there are no goals', () => {
    expect(goalTotals([])).toEqual({
      count: 0,
      reachedCount: 0,
      totalSaved: 0,
      totalTarget: 0,
      totalRemaining: 0,
      percent: 0,
    });
  });
});
