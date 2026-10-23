import { addDays, parseISO, startOfISOWeek } from 'date-fns';

import { isoDay } from '@/lib/format';

export const STAMP_CARD_SIZE = 4;

export type CheckinWeek = {
  weekStart: string;
};

/** Weeks start on Monday, so the weekly review has one clear boundary. */
export function weekStartFor(iso: string): string {
  return isoDay(startOfISOWeek(parseISO(iso)));
}

export function weekEndFor(weekStart: string): string {
  return isoDay(addDays(parseISO(weekStart), 6));
}

export function isWeekStamped(
  checkins: readonly CheckinWeek[],
  weekStart: string,
): boolean {
  return checkins.some((checkin) => checkin.weekStart === weekStart);
}

/**
 * A streak survives until the end of the following week. That gives the user
 * the current week to stamp without losing last week's run.
 */
export function currentStreak(
  checkins: readonly CheckinWeek[],
  today: string,
): number {
  if (checkins.length === 0) return 0;

  const weeks = new Set(checkins.map((checkin) => checkin.weekStart));
  const currentWeek = weekStartFor(today);
  const lastWeek = isoDay(addDays(parseISO(currentWeek), -7));

  if (!weeks.has(currentWeek) && !weeks.has(lastWeek)) return 0;

  let cursor = weeks.has(currentWeek) ? currentWeek : lastWeek;
  let count = 0;

  while (weeks.has(cursor)) {
    count += 1;
    cursor = isoDay(addDays(parseISO(cursor), -7));
  }

  return count;
}

/** A full card keeps all four marks visible until the next stamp starts a new one. */
export function stampsInCard(total: number): number {
  if (total <= 0) return 0;
  const remainder = total % STAMP_CARD_SIZE;
  return remainder === 0 ? STAMP_CARD_SIZE : remainder;
}

export function cardNumber(total: number): number {
  return total <= 0 ? 1 : Math.ceil(total / STAMP_CARD_SIZE);
}

export type TertibBadgeKey = 'first' | 'four' | 'goal';

export type TertibBadge = {
  key: TertibBadgeKey;
  mark: string;
  label: string;
  detail: string;
  earned: boolean;
};

export function tertibBadges(
  checkinCount: number,
  goalReached: boolean,
): TertibBadge[] {
  return [
    {
      key: 'first',
      mark: '01',
      label: 'MINGGU PERTAMA',
      detail: '1 stempel',
      earned: checkinCount >= 1,
    },
    {
      key: 'four',
      mark: '04',
      label: 'EMPAT MINGGU',
      detail: '4 stempel',
      earned: checkinCount >= 4,
    },
    {
      key: 'goal',
      mark: 'T',
      label: 'TARGET PERTAMA',
      detail: '1 target',
      earned: goalReached,
    },
  ];
}
