import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

function withThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Rupiah is stored as integer rupiah, so there is nothing to round here. */
export function rp(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}Rp ${withThousands(Math.abs(value))}`;
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function dayLabel(iso: string): string {
  return format(parseISO(iso), 'EEE, d MMM', { locale: idLocale });
}

export function dayLabelFull(iso: string): string {
  return format(parseISO(iso), 'EEEE, d MMMM yyyy', { locale: idLocale });
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), 'd MMM', { locale: idLocale });
}

export function shortDateWithYear(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: idLocale });
}

export function percentOf(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}
