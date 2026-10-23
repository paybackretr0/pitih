import { csvFileName, transactionsToCsv, type CsvTransaction } from '@/features/backup/csv';

const rows: CsvTransaction[] = [
  {
    date: '2026-10-22',
    type: 'expense',
    categoryName: 'Makan & Minum',
    amount: 25000,
    needWant: 'need',
    note: 'Makan siang',
  },
  {
    date: '2026-10-23',
    type: 'income',
    categoryName: 'Gaji',
    amount: 5000000,
    needWant: null,
    note: null,
  },
];

describe('transactionsToCsv', () => {
  it('starts with a BOM, writes the header, and ends rows with CRLF', () => {
    const csv = transactionsToCsv(rows);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Tanggal,Jenis,Kategori,Nominal,Tag,Catatan\r\n');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('maps type and need/want to Indonesian labels', () => {
    const lines = transactionsToCsv(rows).replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe('2026-10-22,Keluar,Makan & Minum,25000,Kebutuhan,Makan siang');
    expect(lines[2]).toBe('2026-10-23,Masuk,Gaji,5000000,,');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = transactionsToCsv([
      {
        date: '2026-10-24',
        type: 'expense',
        categoryName: 'Belanja, "kecil"',
        amount: 12000,
        needWant: 'want',
        note: 'baris satu\nbaris dua',
      },
    ]);

    expect(csv).toContain('"Belanja, ""kecil"""');
    expect(csv).toContain('"baris satu\nbaris dua"');
  });

  it('writes only the header for an empty history', () => {
    expect(transactionsToCsv([])).toBe('\uFEFFTanggal,Jenis,Kategori,Nominal,Tag,Catatan\r\n');
  });

  it('names the file after the local date', () => {
    expect(csvFileName(new Date(2026, 9, 23))).toBe('pitih-transaksi-2026-10-23.csv');
  });
});
