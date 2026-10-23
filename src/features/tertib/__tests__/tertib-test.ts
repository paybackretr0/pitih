import {
  cardNumber,
  currentStreak,
  isWeekStamped,
  stampsInCard,
  tertibBadges,
  weekEndFor,
  weekStartFor,
} from '@/features/tertib/tertib';

describe('weekStartFor', () => {
  it('returns the Monday of the week', () => {
    expect(weekStartFor('2026-10-23')).toBe('2026-10-19');
    expect(weekStartFor('2026-10-19')).toBe('2026-10-19');
  });
});

describe('weekEndFor', () => {
  it('returns the Sunday of the same week', () => {
    expect(weekEndFor('2026-10-19')).toBe('2026-10-25');
  });
});

describe('isWeekStamped', () => {
  it('matches the stored Monday', () => {
    expect(isWeekStamped([{ weekStart: '2026-10-19' }], '2026-10-19')).toBe(true);
    expect(isWeekStamped([{ weekStart: '2026-10-12' }], '2026-10-19')).toBe(false);
  });
});

describe('currentStreak', () => {
  it('counts consecutive weeks ending this week', () => {
    expect(
      currentStreak(
        [
          { weekStart: '2026-10-19' },
          { weekStart: '2026-10-12' },
          { weekStart: '2026-10-05' },
        ],
        '2026-10-23',
      ),
    ).toBe(3);
  });

  it('keeps last week’s streak alive while this week is still open', () => {
    expect(
      currentStreak(
        [
          { weekStart: '2026-10-19' },
          { weekStart: '2026-10-12' },
        ],
        '2026-10-27',
      ),
    ).toBe(2);
  });

  it('stops at a missing week', () => {
    expect(
      currentStreak(
        [
          { weekStart: '2026-10-19' },
          { weekStart: '2026-10-05' },
        ],
        '2026-10-23',
      ),
    ).toBe(1);
  });

  it('resets after skipping a full week', () => {
    expect(currentStreak([{ weekStart: '2026-10-05' }], '2026-10-23')).toBe(0);
  });

  it('returns zero without any check-in', () => {
    expect(currentStreak([], '2026-10-23')).toBe(0);
  });
});

describe('stampsInCard', () => {
  it('shows the current card progress', () => {
    expect(stampsInCard(0)).toBe(0);
    expect(stampsInCard(1)).toBe(1);
    expect(stampsInCard(3)).toBe(3);
  });

  it('keeps a completed card full at four stamps', () => {
    expect(stampsInCard(4)).toBe(4);
    expect(stampsInCard(8)).toBe(4);
  });

  it('starts the next card after four stamps', () => {
    expect(stampsInCard(5)).toBe(1);
    expect(stampsInCard(9)).toBe(1);
  });
});

describe('cardNumber', () => {
  it('counts cards from one', () => {
    expect(cardNumber(0)).toBe(1);
    expect(cardNumber(4)).toBe(1);
    expect(cardNumber(5)).toBe(2);
    expect(cardNumber(8)).toBe(2);
  });
});

describe('tertibBadges', () => {
  it('locks every badge before the first stamp', () => {
    expect(tertibBadges(0, false).every((badge) => !badge.earned)).toBe(true);
  });

  it('unlocks badges from stamps and a reached goal', () => {
    expect(tertibBadges(1, false).map((badge) => badge.earned)).toEqual([
      true,
      false,
      false,
    ]);
    expect(tertibBadges(4, true).map((badge) => badge.earned)).toEqual([
      true,
      true,
      true,
    ]);
  });
});
