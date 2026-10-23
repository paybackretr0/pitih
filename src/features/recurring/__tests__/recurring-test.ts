import {
  dueRecurringDates,
  nextRecurringDate,
  recurringDayLabel,
  type RecurringRuleLike,
} from '@/features/recurring/recurring';

const base: RecurringRuleLike = {
  dayOfMonth: 31,
  startDate: '2026-01-31',
  lastRunDate: null,
  isActive: true,
};

describe('dueRecurringDates', () => {
  it('clamps the 31st to the last day of shorter months', () => {
    expect(dueRecurringDates(base, '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('skips dates that were already generated', () => {
    expect(
      dueRecurringDates({ ...base, lastRunDate: '2026-03-31' }, '2026-05-15'),
    ).toEqual(['2026-04-30']);
  });

  it('starts from the month after a mid-month start date', () => {
    expect(
      dueRecurringDates(
        { ...base, dayOfMonth: 5, startDate: '2026-10-20' },
        '2026-12-31',
      ),
    ).toEqual(['2026-11-05', '2026-12-05']);
  });

  it('does nothing before the start date or when inactive', () => {
    expect(dueRecurringDates(base, '2026-01-15')).toEqual([]);
    expect(dueRecurringDates({ ...base, isActive: false }, '2026-04-30')).toEqual([]);
  });

  it('caps a long backlog so a first launch cannot flood the list', () => {
    expect(dueRecurringDates(base, '2026-04-30', 2)).toEqual([
      '2026-01-31',
      '2026-02-28',
    ]);
  });

  it('returns nothing for an impossible date', () => {
    expect(dueRecurringDates({ ...base, startDate: 'bukan tanggal' }, '2026-04-30')).toEqual(
      [],
    );
  });
});

describe('nextRecurringDate', () => {
  it('returns today when today is the due date', () => {
    expect(nextRecurringDate(base, '2026-04-30')).toBe('2026-04-30');
  });

  it('moves to next month once this month has passed', () => {
    expect(nextRecurringDate({ ...base, dayOfMonth: 5 }, '2026-10-23')).toBe('2026-11-05');
  });

  it('respects a future start date', () => {
    expect(
      nextRecurringDate({ ...base, dayOfMonth: 5, startDate: '2027-01-01' }, '2026-10-23'),
    ).toBe('2027-01-05');
  });

  it('returns null for an inactive rule', () => {
    expect(nextRecurringDate({ ...base, isActive: false }, '2026-10-23')).toBeNull();
  });
});

describe('recurringDayLabel', () => {
  it('reads as a monthly schedule', () => {
    expect(recurringDayLabel(25)).toBe('TIAP TANGGAL 25');
  });
});
