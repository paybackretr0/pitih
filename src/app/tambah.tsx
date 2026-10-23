import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { DateField } from "@/components/date-field";
import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoChip } from "@/components/neo/neo-chip";
import { NeoInput } from "@/components/neo/neo-input";
import { NeoKeypad } from "@/components/neo/neo-keypad";
import { NeoScreen } from "@/components/neo/neo-screen";
import { NeoSegmented } from "@/components/neo/neo-segmented";
import { NeoEmpty, NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoText } from "@/components/neo/neo-text";
import {
  createTransaction,
  getTransaction,
  listCategories,
  updateTransaction,
} from "@/db/queries";
import type {
  Category,
  NeedWant,
  Transaction,
  TransactionType,
} from "@/db/schema";
import { getSetting, setSetting, SETTING_KEYS } from "@/db/settings";
import { deleteReceipt, storeReceipt } from "@/features/receipts/receipts";
import { useDbQuery } from "@/hooks/use-db-query";
import { dayLabelFull, rp, todayISO } from "@/lib/format";
import { bumpData } from "@/store/app-store";
import {
  border as borderTokens,
  categoryColor,
  colors,
  spacing,
} from "@/theme";

const TYPE_OPTIONS: { value: TransactionType; label: string; bg: string }[] = [
  { value: "expense", label: "KELUAR", bg: colors.pink },
  { value: "income", label: "MASUK", bg: colors.green },
];

const NEED_WANT_OPTIONS: { value: NeedWant; label: string; bg: string }[] = [
  { value: "need", label: "KEBUTUHAN", bg: colors.green },
  { value: "want", label: "KEINGINAN", bg: colors.pink },
];

const MAX_AMOUNT = 999_999_999;

export default function TambahScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const loader = useDbQuery(async () => {
    const [categories, editing, lastCategory] = await Promise.all([
      listCategories(undefined, true),
      editId ? getTransaction(editId) : Promise.resolve(null),
      getSetting(SETTING_KEYS.lastCategory),
    ]);
    return {
      categories,
      editing,
      lastCategoryId: Number.parseInt(lastCategory ?? "", 10) || null,
    };
  }, [editId]);

  if (loader.loading && !loader.data)
    return <NeoLoading label="MENYIAPKAN FORM" />;

  if (loader.error || !loader.data) {
    return (
      <NeoScreen>
        <NeoError
          message={loader.error ?? "Data tidak tersedia."}
          onRetry={loader.retry}
        />
      </NeoScreen>
    );
  }

  if (editId && !loader.data.editing) {
    return (
      <NeoScreen>
        <NeoEmpty
          title="TRANSAKSI TIDAK DITEMUKAN"
          message="Catatan ini mungkin sudah dihapus. Kembali ke daftar transaksi."
          actionLabel="KEMBALI"
          onAction={() => router.back()}
        />
      </NeoScreen>
    );
  }

  return (
    <TransactionForm
      editId={editId}
      categories={loader.data.categories}
      editing={loader.data.editing}
      lastCategoryId={loader.data.lastCategoryId}
    />
  );
}

function TransactionForm({
  editId,
  categories,
  editing,
  lastCategoryId,
}: {
  editId: number | null;
  categories: Category[];
  editing: Transaction | null;
  lastCategoryId: number | null;
}) {
  const initialType = editing?.type ?? "expense";
  const lastCategory = categories.find(
    (category) =>
      category.id === lastCategoryId && category.type === initialType,
  );

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [categoryId, setCategoryId] = useState<number | null>(
    editing?.categoryId ?? lastCategory?.id ?? null,
  );
  const [needWant, setNeedWant] = useState<NeedWant>(
    editing?.needWant ?? "need",
  );
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? "");
  const [receiptUri, setReceiptUri] = useState<string | null>(
    editing?.receiptUri ?? null,
  );
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const originalReceiptUri = editing?.receiptUri ?? null;

  const handleKey = (key: string) => {
    setError(null);
    if (key === "⌫") {
      setAmount((current) => Math.floor(current / 10));
      return;
    }
    setAmount((current) => {
      const next = Number(`${current}${key}`);
      return next > MAX_AMOUNT ? current : next;
    });
  };

  const pickReceipt = async () => {
    if (receiptBusy) return;
    setReceiptBusy(true);
    setError(null);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Izin galeri ditolak. Foto struk tidak bisa dipilih.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      setReceiptUri(await storeReceipt(asset.uri));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal memilih foto struk.",
      );
    } finally {
      setReceiptBusy(false);
    }
  };

  const changeType = (next: TransactionType) => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
    setNeedWant("need");
    setError(null);
  };

  const save = async () => {
    if (saving) return;
    if (amount <= 0) {
      setError("Nominal belum diisi.");
      return;
    }
    if (!categoryId) {
      setError("Pilih kategori dulu.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        amount,
        categoryId,
        note: note.trim() ? note.trim() : null,
        date,
        needWant: type === "expense" ? needWant : null,
        receiptUri,
      };
      if (editId) await updateTransaction(editId, payload);
      else await createTransaction(payload);
      if (originalReceiptUri && originalReceiptUri !== receiptUri) {
        deleteReceipt(originalReceiptUri);
      }
      await setSetting(SETTING_KEYS.lastCategory, String(categoryId));
      bumpData();
      router.back();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan transaksi.",
      );
      setSaving(false);
    }
  };

  const categoryOptions = categories.filter(
    (category) =>
      category.type === type &&
      (!category.isArchived || category.id === categoryId),
  );
  const dateLabel = date === todayISO() ? "Hari ini" : dayLabelFull(date);

  return (
    <NeoScreen
      footer={
        <NeoButton
          label={
            saving ? "MENYIMPAN..." : editId ? "SIMPAN PERUBAHAN" : "SIMPAN"
          }
          onPress={save}
          disabled={saving}
          bg={colors.yellow}
        />
      }
    >
      <View style={styles.header}>
        <NeoText variant="display">{editId ? "UBAH" : "CATAT"}</NeoText>
        <NeoButton
          label="X"
          compact
          offset={3}
          onPress={() => router.back()}
          accessibilityLabel="Tutup form"
        />
      </View>

      <NeoSegmented
        options={TYPE_OPTIONS}
        value={type}
        onChange={changeType}
        accessibilityLabel="Jenis transaksi"
      />

      <NeoCard innerStyle={styles.amountCard}>
        <NeoText variant="label">NOMINAL</NeoText>
        <NeoText
          variant="amountLarge"
          numberOfLines={1}
          style={styles.amount}
          accessibilityLabel={`Nominal ${rp(amount)}`}
        >
          {rp(amount)}
        </NeoText>
      </NeoCard>

      <NeoKeypad onKey={handleKey} />

      <View style={styles.section}>
        <NeoText variant="label">KATEGORI</NeoText>
        {categoryOptions.length === 0 ? (
          <NeoEmpty
            title="BELUM ADA KATEGORI"
            message={`Tambah kategori ${type === "expense" ? "pengeluaran" : "pemasukan"} dulu.`}
            actionLabel="KELOLA KATEGORI"
            onAction={() => router.push("/kategori")}
          />
        ) : (
          <View style={styles.chips}>
            {categoryOptions.map((category) => (
              <NeoChip
                key={category.id}
                label={category.name}
                leading={category.icon ?? undefined}
                bg={categoryColor(category.color)}
                selected={categoryId === category.id}
                onPress={() => {
                  setCategoryId(category.id);
                  setError(null);
                }}
              />
            ))}
          </View>
        )}
      </View>

      {type === "expense" ? (
        <View style={styles.section}>
          <NeoText variant="label">UNTUK</NeoText>
          <NeoSegmented
            options={NEED_WANT_OPTIONS}
            value={needWant}
            onChange={setNeedWant}
            accessibilityLabel="Tag kebutuhan atau keinginan"
          />
        </View>
      ) : null}

      <DateField
        label="TANGGAL"
        value={date}
        displayValue={dateLabel}
        onChange={setDate}
        maximumDate={new Date()}
      />

      <NeoInput
        label="CATATAN (OPSIONAL)"
        value={note}
        onChangeText={setNote}
        placeholder="Misal: makan siang"
        maxLength={120}
      />

      <View style={styles.section}>
        <NeoText variant="label">FOTO STRUK (OPSIONAL)</NeoText>
        {receiptUri ? (
          <View style={styles.receiptPreview}>
            <Image
              source={{ uri: receiptUri }}
              style={styles.receiptImage}
              contentFit="cover"
              accessibilityLabel="Foto struk transaksi"
            />
            <View style={styles.receiptActions}>
              <NeoButton
                label={receiptBusy ? "MEMBUKA..." : "GANTI FOTO"}
                compact
                offset={2}
                disabled={receiptBusy}
                onPress={() => void pickReceipt()}
              />
              <NeoButton
                label="HAPUS FOTO"
                compact
                offset={2}
                bg={colors.white}
                onPress={() => setReceiptUri(null)}
              />
            </View>
          </View>
        ) : (
          <>
            <NeoButton
              label={receiptBusy ? "MEMBUKA GALERI..." : "PILIH FOTO"}
              bg={colors.white}
              disabled={receiptBusy}
              onPress={() => void pickReceipt()}
            />
            <NeoText variant="small">
              Foto disimpan di HP ini dan tidak ikut file backup JSON.
            </NeoText>
          </>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <NeoText variant="small">{error}</NeoText>
        </View>
      ) : null}
    </NeoScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountCard: { gap: spacing.xs },
  amount: { fontSize: 32, lineHeight: 38 },
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  receiptPreview: { gap: spacing.sm },
  receiptImage: {
    width: "100%",
    height: 180,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  receiptActions: { flexDirection: "row", gap: spacing.sm },
  errorBox: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
    padding: spacing.md,
  },
});
