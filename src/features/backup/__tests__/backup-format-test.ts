import {
  BackupFormatError,
  backupFileName,
  dateStamp,
  parseBackupJson,
  serializeBackup,
  type BackupPayload,
} from '@/features/backup/backup-format';

function samplePayload(): BackupPayload {
  return {
    categories: [
      {
        id: 1,
        name: 'Makan & Minum',
        type: 'expense',
        icon: '🍜',
        color: '#FFD93D',
        isDefault: true,
        isArchived: false,
      },
      {
        id: 2,
        name: 'Gaji',
        type: 'income',
        icon: '💰',
        color: '#6BCB77',
        isDefault: true,
        isArchived: false,
      },
    ],
    transactions: [
      {
        id: 10,
        type: 'expense',
        amount: 25000,
        categoryId: 1,
        note: 'Makan siang',
        date: '2026-10-22',
        needWant: 'need',
        receiptUri: null,
        recurringId: null,
        recurringDate: null,
        createdAt: '2026-10-22 12:00:00',
        updatedAt: '2026-10-22 12:00:00',
      },
      {
        id: 11,
        type: 'income',
        amount: 5000000,
        categoryId: 2,
        note: null,
        date: '2026-10-23',
        needWant: null,
        receiptUri: 'file:///receipts/receipt-1.jpg',
        recurringId: 5,
        recurringDate: '2026-10-05',
        createdAt: '2026-10-23 08:00:00',
        updatedAt: '2026-10-23 08:00:00',
      },
    ],
    budgets: [
      { id: 3, categoryId: null, amount: 3000000, periodIndex: null },
      { id: 4, categoryId: 1, amount: 1200000, periodIndex: null },
    ],
    settings: [
      { key: 'period_start_date', value: '2026-10-25' },
      { key: 'reminder_time', value: '20:00' },
      { key: 'reminder_notification_id', value: '' },
    ],
    recurring: [
      {
        id: 5,
        type: 'expense',
        amount: 50000,
        categoryId: 1,
        note: 'Netflix',
        needWant: 'want',
        dayOfMonth: 5,
        startDate: '2026-10-05',
        lastRunDate: '2026-10-05',
        isActive: true,
        createdAt: '2026-10-05 09:00:00',
        updatedAt: '2026-10-05 09:00:00',
      },
    ],
    goals: [
      {
        id: 6,
        name: 'Dana darurat',
        targetAmount: 10000000,
        savedAmount: 2500000,
        deadline: '2027-06-30',
        color: '#B983FF',
        isArchived: false,
        createdAt: '2026-10-01 09:00:00',
      },
    ],
  };
}

describe('backup serialization', () => {
  it('round-trips a valid payload and reports counts', () => {
    const parsed = parseBackupJson(serializeBackup(samplePayload(), new Date('2026-10-23T10:00:00Z')));

    expect(parsed.counts).toEqual({
      categories: 2,
      transactions: 2,
      budgets: 2,
      settings: 3,
      recurring: 1,
      goals: 1,
    });
    expect(parsed.exportedAt).toBe('2026-10-23T10:00:00.000Z');
    expect(parsed.payload.transactions[0]).toMatchObject({
      amount: 25000,
      needWant: 'need',
      note: 'Makan siang',
    });
    expect(parsed.payload.transactions[1]).toMatchObject({
      receiptUri: 'file:///receipts/receipt-1.jpg',
      recurringId: 5,
      recurringDate: '2026-10-05',
    });
    expect(parsed.payload.recurring[0]).toMatchObject({ note: 'Netflix', dayOfMonth: 5 });
    expect(parsed.payload.goals[0]).toMatchObject({ name: 'Dana darurat', savedAmount: 2500000 });
    expect(parsed.payload.settings[2].value).toBe('');
  });

  it('still reads version 1 backups without the new tables', () => {
    const document = JSON.parse(
      serializeBackup(samplePayload(), new Date('2026-10-23T10:00:00Z')),
    );
    document.formatVersion = 1;
    delete document.data.recurring;
    delete document.data.goals;
    delete document.data.transactions[1].receiptUri;
    delete document.data.transactions[1].recurringId;
    delete document.data.transactions[1].recurringDate;

    const parsed = parseBackupJson(JSON.stringify(document));
    expect(parsed.counts.recurring).toBe(0);
    expect(parsed.counts.goals).toBe(0);
    expect(parsed.payload.transactions[1].receiptUri).toBeNull();
    expect(parsed.payload.transactions[1].recurringId).toBeNull();
  });

  it('writes a readable file name from the local date', () => {
    const date = new Date(2026, 0, 5, 9, 30);
    expect(dateStamp(date)).toBe('2026-01-05');
    expect(backupFileName(date)).toBe('pitih-backup-2026-01-05.json');
  });
});

describe('backup validation', () => {
  const parseMutated = (mutate: (payload: BackupPayload) => void) => {
    const payload = samplePayload();
    mutate(payload);
    return () => parseBackupJson(serializeBackup(payload));
  };

  it('refuses a file that is not JSON', () => {
    expect(() => parseBackupJson('bukan json')).toThrow(BackupFormatError);
    expect(() => parseBackupJson('bukan json')).toThrow('bukan JSON yang valid');
  });

  it('refuses another app\'s export', () => {
    const document = JSON.parse(
      serializeBackup(samplePayload(), new Date('2026-10-23T10:00:00Z')),
    );
    document.app = 'kas30';
    expect(() => parseBackupJson(JSON.stringify(document))).toThrow('bukan backup PITIH');
  });

  it('refuses an unknown format version', () => {
    const document = JSON.parse(
      serializeBackup(samplePayload(), new Date('2026-10-23T10:00:00Z')),
    );
    document.formatVersion = 99;
    expect(() => parseBackupJson(JSON.stringify(document))).toThrow('Versi backup tidak dikenal');
  });

  it('refuses a transaction that points at a missing category', () => {
    const run = parseMutated((payload) => {
      payload.transactions[0].categoryId = 99;
    });
    expect(run).toThrow('kategori yang tidak ada');
  });

  it('refuses a transaction whose type does not match its category', () => {
    const run = parseMutated((payload) => {
      payload.transactions[0].type = 'income';
    });
    expect(run).toThrow('tidak cocok dengan jenis kategorinya');
  });

  it('refuses an impossible date', () => {
    const run = parseMutated((payload) => {
      payload.transactions[0].date = '2026-02-30';
    });
    expect(run).toThrow('format YYYY-MM-DD');
  });

  it('refuses a fractional or non-positive amount', () => {
    expect(
      parseMutated((payload) => {
        payload.transactions[0].amount = 25000.5;
      }),
    ).toThrow('bilangan bulat');

    expect(
      parseMutated((payload) => {
        payload.transactions[0].amount = 0;
      }),
    ).toThrow('bilangan bulat');
  });

  it('refuses duplicate transaction ids', () => {
    const run = parseMutated((payload) => {
      payload.transactions[1].id = payload.transactions[0].id;
    });
    expect(run).toThrow('ID transaksi yang dobel');
  });

  it('refuses a budget for a missing category', () => {
    const run = parseMutated((payload) => {
      payload.budgets[1].categoryId = 99;
    });
    expect(run).toThrow('kategori yang tidak ada di backup');
  });

  it('refuses duplicate setting keys', () => {
    const run = parseMutated((payload) => {
      payload.settings[1].key = payload.settings[0].key;
    });
    expect(run).toThrow('kunci pengaturan yang dobel');
  });

  it('refuses a transaction without a category id', () => {
    const run = parseMutated((payload) => {
      payload.transactions[0].categoryId = Number.NaN;
    });
    expect(run).toThrow('tidak punya kategori yang sah');
  });
});
