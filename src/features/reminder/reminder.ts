export const DEFAULT_REMINDER_TIME = '20:00';

export type ReminderTime = {
  hour: number;
  minute: number;
};

export const REMINDER_TITLE = 'Belum catat hari ini?';
export const REMINDER_BODY =
  'Buka PITIH dan catat pengeluaran hari ini. Sisa jatah harian langsung kelihatan.';

/** Strict HH:mm, because the value is also written straight into settings. */
export function parseReminderTime(value: string | null | undefined): ReminderTime | null {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatReminderTime({ hour, minute }: ReminderTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
