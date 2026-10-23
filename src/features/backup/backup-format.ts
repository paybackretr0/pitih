import type { NeedWant, TransactionType } from '@/db/schema';

export const BACKUP_APP = 'pitih';
export const BACKUP_FORMAT_VERSION = 2;
const READABLE_VERSIONS = [1, 2];

export type BackupCategory = {
  id: number;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  isArchived: boolean;
};

export type BackupTransaction = {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number;
  note: string | null;
  date: string;
  needWant: NeedWant | null;
  receiptUri: string | null;
  recurringId: number | null;
  recurringDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupBudget = {
  id: number;
  categoryId: number | null;
  amount: number;
  periodIndex: number | null;
};

export type BackupSetting = {
  key: string;
  value: string;
};

export type BackupRecurringRule = {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number;
  note: string | null;
  needWant: NeedWant | null;
  dayOfMonth: number;
  startDate: string;
  lastRunDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BackupGoal = {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: string;
};

export type BackupPayload = {
  categories: BackupCategory[];
  transactions: BackupTransaction[];
  budgets: BackupBudget[];
  settings: BackupSetting[];
  recurring: BackupRecurringRule[];
  goals: BackupGoal[];
};

export type BackupDocument = {
  app: typeof BACKUP_APP;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  data: BackupPayload;
};

export type BackupCounts = {
  categories: number;
  transactions: number;
  budgets: number;
  settings: number;
  recurring: number;
  goals: number;
};

export type ParsedBackup = {
  payload: BackupPayload;
  exportedAt: string;
  counts: BackupCounts;
};

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

function fail(message: string): never {
  throw new BackupFormatError(message);
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(message);
  return value as Record<string, unknown>;
}

function asArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) fail(message);
  return value;
}

function asString(value: unknown, message: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) fail(message);
  return value;
}

function asNullableString(value: unknown, message: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') fail(message);
  return value;
}

function asInteger(value: unknown, message: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) fail(message);
  return value;
}

function asNullableInteger(value: unknown, message: string): number | null {
  if (value === null || value === undefined) return null;
  return asInteger(value, message, 0);
}

function asBoolean(value: unknown, message: string): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  fail(message);
}

function asType(value: unknown, message: string): TransactionType {
  if (value === 'income' || value === 'expense') return value;
  fail(message);
}

function asNeedWant(value: unknown, message: string): NeedWant | null {
  if (value === null || value === undefined) return null;
  if (value === 'need' || value === 'want') return value;
  fail(message);
}

/** Local YYYY-MM-DD, so a backup name matches the date the user sees. */
export function dateStamp(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function backupFileName(date = new Date()): string {
  return `pitih-backup-${dateStamp(date)}.json`;
}

export function serializeBackup(payload: BackupPayload, exportedAt = new Date()): string {
  const document: BackupDocument = {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    data: payload,
  };
  return JSON.stringify(document, null, 2);
}

function assertUniqueIds(ids: number[], message: string) {
  if (new Set(ids).size !== ids.length) fail(message);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function asNullableIsoDate(value: unknown, message: string): string | null {
  if (value === null || value === undefined) return null;
  const text = asString(value, message);
  if (!isIsoDate(text)) fail(message);
  return text;
}

/**
 * Validates a JSON file before it replaces local data. Restoring is the one
 * place a bad file can destroy real records, so every reference is checked.
 */
export function parseBackupJson(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('File ini bukan JSON yang valid.');
  }

  const root = asRecord(raw, 'Isi file bukan objek JSON.');
  if (root.app !== BACKUP_APP) fail('File ini bukan backup PITIH.');
  const version = root.formatVersion;
  if (typeof version !== 'number' || !READABLE_VERSIONS.includes(version)) {
    fail('Versi backup tidak dikenal. Perbarui aplikasi dulu.');
  }

  const data = asRecord(root.data, 'Bagian data di backup tidak ditemukan.');
  const now = new Date().toISOString();

  const categories = asArray(data.categories, 'Daftar kategori tidak ditemukan.').map(
    (item, index): BackupCategory => {
      const row = asRecord(item, `Kategori ke-${index + 1} rusak.`);
      return {
        id: asInteger(row.id, `Kategori ke-${index + 1} tidak punya ID yang sah.`, 1),
        name: asString(row.name, `Kategori ke-${index + 1} tidak punya nama.`),
        type: asType(row.type, `Jenis kategori ke-${index + 1} tidak dikenal.`),
        icon: asNullableString(row.icon, `Ikon kategori ke-${index + 1} rusak.`),
        color: asNullableString(row.color, `Warna kategori ke-${index + 1} rusak.`),
        isDefault: asBoolean(row.isDefault ?? false, `Penanda bawaan kategori ke-${index + 1} rusak.`),
        isArchived: asBoolean(
          row.isArchived ?? false,
          `Penanda arsip kategori ke-${index + 1} rusak.`,
        ),
      };
    },
  );
  assertUniqueIds(
    categories.map((category) => category.id),
    'Ada ID kategori yang dobel di backup.',
  );

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const transactions = asArray(data.transactions, 'Daftar transaksi tidak ditemukan.').map(
    (item, index): BackupTransaction => {
      const row = asRecord(item, `Transaksi ke-${index + 1} rusak.`);
      const categoryId = asInteger(
        row.categoryId,
        `Transaksi ke-${index + 1} tidak punya kategori yang sah.`,
        1,
      );
      const category = categoryById.get(categoryId);
      if (!category) {
        fail(`Transaksi ke-${index + 1} memakai kategori yang tidak ada di backup.`);
      }
      const type = asType(row.type, `Jenis transaksi ke-${index + 1} tidak dikenal.`);
      if (category.type !== type) {
        fail(`Transaksi ke-${index + 1} tidak cocok dengan jenis kategorinya.`);
      }
      const date = asString(row.date, `Tanggal transaksi ke-${index + 1} kosong.`);
      if (!isIsoDate(date)) {
        fail(`Tanggal transaksi ke-${index + 1} tidak memakai format YYYY-MM-DD.`);
      }
      return {
        id: asInteger(row.id, `Transaksi ke-${index + 1} tidak punya ID yang sah.`, 1),
        type,
        amount: asInteger(row.amount, `Nominal transaksi ke-${index + 1} harus bilangan bulat.`, 1),
        categoryId,
        note: asNullableString(row.note, `Catatan transaksi ke-${index + 1} rusak.`),
        date,
        needWant: asNeedWant(
          row.needWant,
          `Tag kebutuhan transaksi ke-${index + 1} tidak dikenal.`,
        ),
        receiptUri: asNullableString(row.receiptUri, `Foto struk transaksi ke-${index + 1} rusak.`),
        recurringId: asNullableInteger(
          row.recurringId,
          `ID jadwal transaksi ke-${index + 1} rusak.`,
        ),
        recurringDate: asNullableIsoDate(
          row.recurringDate,
          `Tanggal jadwal transaksi ke-${index + 1} rusak.`,
        ),
        createdAt: asString(row.createdAt ?? now, `Waktu buat transaksi ke-${index + 1} kosong.`),
        updatedAt: asString(row.updatedAt ?? now, `Waktu ubah transaksi ke-${index + 1} kosong.`),
      };
    },
  );
  assertUniqueIds(
    transactions.map((transaction) => transaction.id),
    'Ada ID transaksi yang dobel di backup.',
  );

  const budgets = asArray(data.budgets, 'Daftar budget tidak ditemukan.').map(
    (item, index): BackupBudget => {
      const row = asRecord(item, `Budget ke-${index + 1} rusak.`);
      const categoryId = asNullableInteger(
        row.categoryId,
        `Kategori budget ke-${index + 1} rusak.`,
      );
      if (categoryId !== null && !categoryById.has(categoryId)) {
        fail(`Budget ke-${index + 1} memakai kategori yang tidak ada di backup.`);
      }
      return {
        id: asInteger(row.id, `Budget ke-${index + 1} tidak punya ID yang sah.`, 1),
        categoryId,
        amount: asInteger(row.amount, `Nominal budget ke-${index + 1} harus bilangan bulat.`, 1),
        periodIndex: asNullableInteger(row.periodIndex, `Indeks periode budget ke-${index + 1} rusak.`),
      };
    },
  );
  assertUniqueIds(
    budgets.map((budget) => budget.id),
    'Ada ID budget yang dobel di backup.',
  );

  const settings = asArray(data.settings, 'Daftar pengaturan tidak ditemukan.').map(
    (item, index): BackupSetting => {
      const row = asRecord(item, `Pengaturan ke-${index + 1} rusak.`);
      return {
        key: asString(row.key, `Kunci pengaturan ke-${index + 1} kosong.`),
        value: asString(row.value, `Nilai pengaturan ke-${index + 1} rusak.`, true),
      };
    },
  );
  if (new Set(settings.map((setting) => setting.key)).size !== settings.length) {
    fail('Ada kunci pengaturan yang dobel di backup.');
  }

  const recurringSource =
    version === 1 ? [] : asArray(data.recurring, 'Daftar jadwal berulang tidak ditemukan.');
  const recurring = recurringSource.map((item, index): BackupRecurringRule => {
    const row = asRecord(item, `Jadwal berulang ke-${index + 1} rusak.`);
    const categoryId = asInteger(
      row.categoryId,
      `Jadwal ke-${index + 1} tidak punya kategori yang sah.`,
      1,
    );
    const category = categoryById.get(categoryId);
    if (!category) {
      fail(`Jadwal ke-${index + 1} memakai kategori yang tidak ada di backup.`);
    }
    const type = asType(row.type, `Jenis jadwal ke-${index + 1} tidak dikenal.`);
    if (category.type !== type) {
      fail(`Jadwal ke-${index + 1} tidak cocok dengan jenis kategorinya.`);
    }
    const dayOfMonth = asInteger(row.dayOfMonth, `Tanggal jadwal ke-${index + 1} rusak.`, 1);
    if (dayOfMonth > 31) fail(`Tanggal jadwal ke-${index + 1} harus antara 1 dan 31.`);
    const startDate = asString(row.startDate, `Tanggal mulai jadwal ke-${index + 1} kosong.`);
    if (!isIsoDate(startDate)) {
      fail(`Tanggal mulai jadwal ke-${index + 1} tidak memakai format YYYY-MM-DD.`);
    }
    return {
      id: asInteger(row.id, `Jadwal ke-${index + 1} tidak punya ID yang sah.`, 1),
      type,
      amount: asInteger(row.amount, `Nominal jadwal ke-${index + 1} harus bilangan bulat.`, 1),
      categoryId,
      note: asNullableString(row.note, `Catatan jadwal ke-${index + 1} rusak.`),
      needWant: asNeedWant(row.needWant, `Tag kebutuhan jadwal ke-${index + 1} tidak dikenal.`),
      dayOfMonth,
      startDate,
      lastRunDate: asNullableIsoDate(
        row.lastRunDate,
        `Tanggal jalan terakhir jadwal ke-${index + 1} rusak.`,
      ),
      isActive: asBoolean(row.isActive ?? true, `Status jadwal ke-${index + 1} rusak.`),
      createdAt: asString(row.createdAt ?? now, `Waktu buat jadwal ke-${index + 1} kosong.`),
      updatedAt: asString(row.updatedAt ?? now, `Waktu ubah jadwal ke-${index + 1} kosong.`),
    };
  });
  assertUniqueIds(
    recurring.map((rule) => rule.id),
    'Ada ID jadwal berulang yang dobel di backup.',
  );
  const recurringIds = new Set(recurring.map((rule) => rule.id));
  const runKeys = new Set<string>();
  for (const transaction of transactions) {
    if (transaction.recurringId === null) continue;
    if (!recurringIds.has(transaction.recurringId)) {
      fail(`Transaksi ke-${transaction.id} memakai jadwal yang tidak ada di backup.`);
    }
    if (transaction.recurringDate) {
      const key = `${transaction.recurringId}:${transaction.recurringDate}`;
      if (runKeys.has(key)) fail('Ada transaksi berulang yang dobel di backup.');
      runKeys.add(key);
    }
  }

  const goalsSource = version === 1 ? [] : asArray(data.goals, 'Daftar target tidak ditemukan.');
  const goals = goalsSource.map((item, index): BackupGoal => {
    const row = asRecord(item, `Target ke-${index + 1} rusak.`);
    return {
      id: asInteger(row.id, `Target ke-${index + 1} tidak punya ID yang sah.`, 1),
      name: asString(row.name, `Target ke-${index + 1} tidak punya nama.`),
      targetAmount: asInteger(
        row.targetAmount,
        `Nominal target ke-${index + 1} harus bilangan bulat.`,
        1,
      ),
      savedAmount: asInteger(
        row.savedAmount ?? 0,
        `Dana target ke-${index + 1} harus bilangan bulat.`,
        0,
      ),
      deadline: asNullableIsoDate(row.deadline, `Tenggara target ke-${index + 1} rusak.`),
      color: asNullableString(row.color, `Warna target ke-${index + 1} rusak.`),
      isArchived: asBoolean(row.isArchived ?? false, `Penanda arsip target ke-${index + 1} rusak.`),
      createdAt: asString(row.createdAt ?? now, `Waktu buat target ke-${index + 1} kosong.`),
    };
  });
  assertUniqueIds(
    goals.map((goal) => goal.id),
    'Ada ID target yang dobel di backup.',
  );

  return {
    payload: { categories, transactions, budgets, settings, recurring, goals },
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : '',
    counts: {
      categories: categories.length,
      transactions: transactions.length,
      budgets: budgets.length,
      settings: settings.length,
      recurring: recurring.length,
      goals: goals.length,
    },
  };
}
