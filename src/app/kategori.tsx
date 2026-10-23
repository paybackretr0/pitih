import { router } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoInput } from "@/components/neo/neo-input";
import { NeoSegmented } from "@/components/neo/neo-segmented";
import { NeoEmpty, NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoSurface } from "@/components/neo/neo-surface";
import { NeoText } from "@/components/neo/neo-text";
import {
  createCategory,
  listCategories,
  setCategoryArchived,
  updateCategory,
} from "@/db/queries";
import type { Category, TransactionType } from "@/db/schema";
import { useDbQuery } from "@/hooks/use-db-query";
import { bumpData } from "@/store/app-store";
import {
  border as borderTokens,
  categoryColor,
  categoryColors,
  colors,
  layout,
  spacing,
} from "@/theme";

const TYPE_OPTIONS: { value: TransactionType; label: string; bg: string }[] = [
  { value: "expense", label: "PENGELUARAN", bg: colors.pink },
  { value: "income", label: "PEMASUKAN", bg: colors.green },
];

const ICONS = [
  "🍜",
  "🛵",
  "🛍️",
  "🧾",
  "🎬",
  "🩺",
  "📚",
  "📱",
  "📦",
  "💰",
  "🎁",
  "🏪",
  "🎉",
  "➕",
  "🏠",
  "💡",
];

export default function KategoriScreen() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const list = useDbQuery(() => listCategories(undefined, true), []);

  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [icon, setIcon] = useState("🍜");
  const [color, setColor] = useState<string>(colors.yellow);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setIcon("🍜");
    setColor(colors.yellow);
    setError(null);
  };

  const beginEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setType(category.type);
    setIcon(category.icon ?? "🍜");
    setColor(categoryColor(category.color));
    setError(null);
    setNotice(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Nama kategori belum diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: trimmed, icon, color });
        setNotice("Kategori diperbarui.");
      } else {
        await createCategory({ name: trimmed, type, icon, color });
        setNotice("Kategori ditambahkan.");
      }
      bumpData();
      resetForm();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan kategori.",
      );
    } finally {
      setSaving(false);
    }
  };

  const archive = (category: Category) => {
    Alert.alert(
      "Arsipkan kategori?",
      `${category.name} akan hilang dari form catat. Transaksi lama tetap tersimpan.`,
      [
        { text: "BATAL", style: "cancel" },
        {
          text: "ARSIPKAN",
          style: "destructive",
          onPress: () => {
            setCategoryArchived(category.id, true)
              .then(() => {
                bumpData();
                if (editing?.id === category.id) resetForm();
                setNotice("Kategori diarsipkan.");
              })
              .catch((caught: unknown) =>
                Alert.alert(
                  "Gagal mengarsipkan",
                  caught instanceof Error
                    ? caught.message
                    : "Coba lagi sebentar.",
                ),
              );
          },
        },
      ],
    );
  };

  const restore = async (category: Category) => {
    try {
      await setCategoryArchived(category.id, false);
      bumpData();
      setNotice("Kategori diaktifkan lagi.");
    } catch (caught) {
      Alert.alert(
        "Gagal mengaktifkan",
        caught instanceof Error ? caught.message : "Coba lagi sebentar.",
      );
    }
  };

  const categories = list.data ?? [];
  const active = categories.filter((category) => !category.isArchived);
  const archived = categories.filter((category) => category.isArchived);
  const expenseCategories = active.filter(
    (category) => category.type === "expense",
  );
  const incomeCategories = active.filter(
    (category) => category.type === "income",
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <NeoText variant="display">KATEGORI</NeoText>
          <NeoButton
            label="X"
            compact
            offset={3}
            onPress={() => router.back()}
            accessibilityLabel="Tutup kelola kategori"
          />
        </View>

        <NeoCard innerStyle={styles.form}>
          <NeoText variant="label">
            {editing ? "UBAH KATEGORI" : "TAMBAH KATEGORI"}
          </NeoText>

          {editing ? (
            <NeoText variant="small">
              {`Jenis: ${editing.type === "expense" ? "pengeluaran" : "pemasukan"}. Jenis tidak bisa diubah supaya transaksi lama tetap sesuai.`}
            </NeoText>
          ) : (
            <NeoSegmented
              options={TYPE_OPTIONS}
              value={type}
              onChange={setType}
              accessibilityLabel="Jenis kategori"
            />
          )}

          <NeoInput
            label="NAMA KATEGORI"
            value={name}
            onChangeText={setName}
            placeholder="Misal: Kopi"
            maxLength={40}
          />

          <View style={styles.picker}>
            <NeoText variant="label">IKON</NeoText>
            <View style={styles.iconGrid}>
              {ICONS.map((option) => {
                const selected = icon === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={`Ikon ${option}`}
                    accessibilityState={{ selected }}
                    onPress={() => setIcon(option)}
                    style={[styles.iconButton, selected && styles.selectedIcon]}
                  >
                    <Text style={styles.iconGlyph}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.picker}>
            <NeoText variant="label">WARNA</NeoText>
            <View style={styles.colorGrid}>
              {categoryColors.map((option) => {
                const selected = color === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={`Warna ${option}`}
                    accessibilityState={{ selected }}
                    onPress={() => setColor(option)}
                    style={[styles.colorButton, { backgroundColor: option }]}
                  >
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <NeoText variant="small">{error}</NeoText>
            </View>
          ) : null}

          {notice ? (
            <View style={styles.noticeBox}>
              <NeoText variant="small">{notice}</NeoText>
            </View>
          ) : null}

          <NeoButton
            label={
              saving
                ? "MENYIMPAN..."
                : editing
                  ? "SIMPAN PERUBAHAN"
                  : "TAMBAH KATEGORI"
            }
            onPress={save}
            disabled={saving}
          />

          {editing ? (
            <View style={styles.editActions}>
              <NeoButton label="BATAL" compact onPress={resetForm} />
              <NeoButton
                label="ARSIPKAN"
                compact
                bg={colors.red}
                disabled={editing.isDefault}
                onPress={() => archive(editing)}
                accessibilityHint={
                  editing.isDefault
                    ? "Kategori bawaan tidak bisa diarsipkan"
                    : undefined
                }
              />
            </View>
          ) : null}
          {editing?.isDefault ? (
            <NeoText variant="small">
              Kategori bawaan tidak bisa diarsipkan, tapi nama dan tampilannya
              bisa diubah.
            </NeoText>
          ) : null}
        </NeoCard>

        {list.loading && !list.data ? <NeoLoading /> : null}
        {list.error ? (
          <NeoError message={list.error} onRetry={list.retry} />
        ) : null}

        {list.data && active.length === 0 ? (
          <NeoEmpty
            title="BELUM ADA KATEGORI"
            message="Tambahkan kategori pertama lewat form di atas."
          />
        ) : null}

        {expenseCategories.length > 0 ? (
          <CategorySection
            title="PENGELUARAN"
            items={expenseCategories}
            onEdit={beginEdit}
          />
        ) : null}
        {incomeCategories.length > 0 ? (
          <CategorySection
            title="PEMASUKAN"
            items={incomeCategories}
            onEdit={beginEdit}
          />
        ) : null}

        {archived.length > 0 ? (
          <View style={styles.section}>
            <NeoText variant="label">DIARSIPKAN</NeoText>
            {archived.map((category) => (
              <NeoSurface
                key={category.id}
                offset={3}
                innerStyle={styles.row}
                bg={colors.white}
              >
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: categoryColor(category.color) },
                  ]}
                >
                  <Text style={styles.iconGlyph}>{category.icon ?? "•"}</Text>
                </View>
                <NeoText
                  variant="body"
                  numberOfLines={1}
                  style={styles.rowName}
                >
                  {category.name}
                </NeoText>
                <NeoButton
                  label="AKTIFKAN"
                  compact
                  offset={2}
                  onPress={() => restore(category)}
                  accessibilityLabel={`Aktifkan lagi kategori ${category.name}`}
                />
              </NeoSurface>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CategorySection({
  title,
  items,
  onEdit,
}: {
  title: string;
  items: Category[];
  onEdit: (category: Category) => void;
}) {
  return (
    <View style={styles.section}>
      <NeoText variant="label">{title}</NeoText>
      {items.map((category) => (
        <NeoSurface
          key={category.id}
          offset={3}
          innerStyle={styles.row}
          bg={colors.white}
        >
          <View
            style={[
              styles.rowIcon,
              { backgroundColor: categoryColor(category.color) },
            ]}
          >
            <Text style={styles.iconGlyph}>{category.icon ?? "•"}</Text>
          </View>
          <NeoText variant="body" numberOfLines={1} style={styles.rowName}>
            {category.name}
          </NeoText>
          <NeoButton
            label="UBAH"
            compact
            offset={2}
            onPress={() => onEdit(category)}
            accessibilityLabel={`Ubah kategori ${category.name}`}
          />
        </NeoSurface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  form: { gap: spacing.md },
  picker: { gap: spacing.sm },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  iconButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  selectedIcon: { backgroundColor: colors.yellow },
  iconGlyph: { fontSize: 20 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  colorButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { fontSize: 18, color: colors.ink },
  errorBox: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
    padding: spacing.md,
  },
  noticeBox: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.green,
    padding: spacing.md,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  section: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.ink,
  },
  rowName: { flex: 1 },
});
