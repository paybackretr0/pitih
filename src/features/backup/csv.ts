import { dateStamp } from './backup-format';
import type { NeedWant, TransactionType } from '@/db/schema';

export type CsvTransaction = {
  date: string;
  type: TransactionType;
  categoryName: string;
  amount: number;
  needWant: NeedWant | null;
  note: string | null;
};

export const CSV_HEADERS = ['Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Tag', 'Catatan'] as const;

const typeLabel: Record<TransactionType, string> = {
  income: 'Masuk',
  expense: 'Keluar',
};

const needWantLabel: Record<NeedWant, string> = {
  need: 'Kebutuhan',
  want: 'Keinginan',
};

export function csvFileName(date = new Date()): string {
  return `pitih-transaksi-${dateStamp(date)}.csv`;
}

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * A BOM keeps Excel from mangling the emoji in category names. Rows are plain
 * integers so the numbers stay exact when the file is opened anywhere.
 */
export function transactionsToCsv(rows: CsvTransaction[]): string {
  const lines = [CSV_HEADERS.join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.date,
        typeLabel[row.type],
        row.categoryName,
        String(row.amount),
        row.needWant ? needWantLabel[row.needWant] : '',
        row.note ?? '',
      ]
        .map(escapeCell)
        .join(','),
    );
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
