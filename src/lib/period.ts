import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

import { isoDay } from './format';

/** Fixed 30-day cycles keep every period comparable, unlike rolling windows. */
export const PERIOD_LENGTH = 30;

export type Period = {
  index: number;
  startDate: string;
  start: string;
  end: string;
};

export function periodAtIndex(startDate: string, index: number): Period {
  const start = addDays(parseISO(startDate), index * PERIOD_LENGTH);
  const end = addDays(start, PERIOD_LENGTH - 1);
  return {
    index,
    startDate,
    start: isoDay(start),
    end: isoDay(end),
  };
}

export function periodFor(startDate: string, date: string): Period {
  const offset = differenceInCalendarDays(parseISO(date), parseISO(startDate));
  return periodAtIndex(startDate, Math.floor(offset / PERIOD_LENGTH));
}

export function shiftPeriod(period: Period, delta: number): Period {
  return periodAtIndex(period.startDate, period.index + delta);
}

export function currentPeriod(startDate: string, today: string): Period {
  return periodFor(startDate, today);
}

/** 30 before the period starts, 0 once it has ended. */
export function daysLeft(period: Period, today: string): number {
  if (today < period.start) return PERIOD_LENGTH;
  if (today > period.end) return 0;
  return differenceInCalendarDays(parseISO(period.end), parseISO(today)) + 1;
}

export function isPeriodCurrent(period: Period, today: string): boolean {
  return today >= period.start && today <= period.end;
}
