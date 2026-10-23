import { getDaysInMonth, parseISO } from "date-fns";

import { isoDay } from "@/lib/format";

export type RecurringRuleLike = {
  dayOfMonth: number;
  startDate: string;
  lastRunDate: string | null;
  isActive: boolean;
};

const MAX_MONTHS = 240;

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function occurrenceInMonth(month: Date, dayOfMonth: number): string {
  const day = Math.min(Math.max(dayOfMonth, 1), getDaysInMonth(month));
  return isoDay(new Date(month.getFullYear(), month.getMonth(), day));
}

/**
 * Every monthly occurrence that is due up to today and has not been generated
 * yet. A rule set to the 31st lands on the last day of shorter months.
 */
export function dueRecurringDates(
  rule: RecurringRuleLike,
  today: string,
  limit = 60,
): string[] {
  if (!rule.isActive || limit <= 0) return [];

  const start = parseISO(rule.startDate);
  const end = parseISO(today);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  )
    return [];

  const dates: string[] = [];
  const cursor = monthStart(start);
  const endMonth = monthStart(end);

  for (let months = 0; cursor <= endMonth && months < MAX_MONTHS; months += 1) {
    const date = occurrenceInMonth(cursor, rule.dayOfMonth);
    if (
      date >= rule.startDate &&
      date <= today &&
      (!rule.lastRunDate || date > rule.lastRunDate)
    ) {
      dates.push(date);
      if (dates.length >= limit) break;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return dates;
}

/** The next occurrence on or after today, for the list screen. */
export function nextRecurringDate(
  rule: RecurringRuleLike,
  today: string,
): string | null {
  if (!rule.isActive) return null;

  const start = parseISO(rule.startDate);
  const end = parseISO(today);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const cursor = monthStart(start > end ? start : end);
  for (let months = 0; months < MAX_MONTHS; months += 1) {
    const date = occurrenceInMonth(cursor, rule.dayOfMonth);
    if (date >= rule.startDate && date >= today) return date;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return null;
}

export function recurringDayLabel(dayOfMonth: number): string {
  return `TIAP TANGGAL ${dayOfMonth}`;
}
