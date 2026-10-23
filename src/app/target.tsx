import { addDays, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DateField } from "@/components/date-field";
import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoInput } from "@/components/neo/neo-input";
import { NeoProgress } from "@/components/neo/neo-progress";
import { NeoEmpty, NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoSurface } from "@/components/neo/neo-surface";
import { NeoText } from "@/components/neo/neo-text";
import {
  addGoalFunds,
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
  type GoalInput,
} from "@/db/goals";
import type { Goal } from "@/db/schema";
import {
  goalDaysLeft,
  goalProgressPercent,
  isGoalReached,
} from "@/features/goals/goals";
import { useDbQuery } from "@/hooks/use-db-query";
import { useToday } from "@/hooks/use-today";
import { dayLabelFull, isoDay, rp, todayISO } from "@/lib/format";
import { bumpData } from "@/store/app-store";
import {
  border as borderTokens,
  categoryColor,
  categoryColors,
  colors,
  layout,
  spacing,
} from "@/theme";

function onlyDigits(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 12);
}

export default function TargetScreen() {
  const today = useToday();
  const query = useDbQuery(() => listGoals(), []);

  const [name, setName] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [savedInput, setSavedInput] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [color, setColor] = useState<string>(colors.purple);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fundingId, setFundingId] = useState<number | null>(null);
  const [fundInput, setFundInput] = useState("");

  const resetForm = () => {
    setEditing(null);
    setName("");
    setTargetInput("");
    setSavedInput("");
    setDeadline(null);
    setColor(colors.purple);
    setError(null);
  };

  const beginEdit = (goal: Goal) => {
    setEditing(goal);
    setName(goal.name);
    setTargetInput(String(goal.targetAmount));
    setSavedInput(String(goal.savedAmount));
    setDeadline(goal.deadline);
    setColor(categoryColor(goal.color));
    setError(null);
    setNotice(null);
    setFundingId(null);
  };

  const save = async () => {
    const trimmed = name.trim();
    const target = Number(targetInput || 0);
    const saved = Number(savedInput || 0);
    if (!trimmed) {
      setError("Nama target belum diisi.");
      return;
    }
    if (target <= 0) {
      setError("Nominal target harus lebih dari nol.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: GoalInput = {
        name: trimmed,
        targetAmount: target,
        savedAmount: Math.max(0, saved),
        deadline,
        color,
      };
      if (editing) {
        await updateGoal(editing.id, payload);
        setNotice("Target diperbarui.");
      } else {
        await createGoal(payload);
        setNotice(
          "Target dibuat. Tambah dana tiap kali kamu menyisihkan uang.",
        );
      }
      bumpData();
      resetForm();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan target.",
      );
    } finally {
      setSaving(false);
    }
  };

  const addFunds = async (goal: Goal) => {
    const amount = Number(fundInput || 0);
    if (amount <= 0) {
      setError("Nominal dana belum diisi.");
      return;
    }
    try {
      await addGoalFunds(goal.id, amount);
      bumpData();
      setFundingId(null);
      setFundInput("");
      setNotice(`Dana ${rp(amount)} ditambahkan ke ${goal.name}.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menambah dana.",
      );
    }
  };

  const remove = (goal: Goal) => {
    Alert.alert(
      "Hapus target?",
      `${goal.name} dan catatan dananya akan dihapus. Transaksi tidak berubah.`,
      [
        { text: "BATAL", style: "cancel" },
        {
          text: "HAPUS",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteGoal(goal.id);
                bumpData();
                if (editing?.id === goal.id) resetForm();
                setNotice("Target dihapus.");
              } catch (caught) {
                Alert.alert(
                  "Gagal menghapus",
                  caught instanceof Error
                    ? caught.message
                    : "Coba lagi sebentar.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const goals = query.data ?? [];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <NeoText variant="display">TARGET</NeoText>
          <NeoButton
            label="X"
            compact
            offset={3}
            onPress={() => router.back()}
            accessibilityLabel="Tutup target tabungan"
          />
        </View>

        <NeoCard innerStyle={styles.form}>
          <NeoText variant="label">
            {editing ? "UBAH TARGET" : "TARGET BARU"}
          </NeoText>
          <NeoText variant="small">
            Target tabungan tidak mengubah saldo transaksi. Dana yang kamu catat
            di sini adalah uang yang memang disisihkan.
          </NeoText>

          <NeoInput
            label="NAMA TARGET"
            value={name}
            onChangeText={setName}
            placeholder="Misal: Dana darurat"
            maxLength={60}
          />

          <NeoInput
            label="TARGET NOMINAL (RUPIAH)"
            value={targetInput}
            onChangeText={(value) => setTargetInput(onlyDigits(value))}
            keyboardType="number-pad"
            placeholder="0"
          />
          <NeoText variant="small" color="#11111199">
            {targetInput ? rp(Number(targetInput)) : "Belum diisi"}
          </NeoText>

          <NeoInput
            label="SUDAH TERKUMPUL (RUPIAH)"
            value={savedInput}
            onChangeText={(value) => setSavedInput(onlyDigits(value))}
            keyboardType="number-pad"
            placeholder="0"
          />

          <View style={styles.rowBetween}>
            <NeoText variant="label">TENGGARA</NeoText>
            <NeoButton
              label={deadline ? "HAPUS" : "ATUR"}
              compact
              offset={2}
              bg={colors.white}
              onPress={() =>
                setDeadline(
                  deadline ? null : isoDay(addDays(parseISO(todayISO()), 30)),
                )
              }
            />
          </View>
          {deadline ? (
            <DateField
              label="TANGGAL TENGGARA"
              value={deadline}
              displayValue={dayLabelFull(deadline)}
              onChange={setDeadline}
            />
          ) : (
            <NeoText variant="small">
              Tanpa tenggara. Target tetap bisa dicicil kapan saja.
            </NeoText>
          )}

          <View style={styles.section}>
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
                    {selected ? <NeoText variant="label">✓</NeoText> : null}
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
                  : "BUAT TARGET"
            }
            onPress={() => void save()}
            disabled={saving}
          />

          {editing ? (
            <View style={styles.editActions}>
              <NeoButton label="BATAL" compact onPress={resetForm} />
              <NeoButton
                label="HAPUS TARGET"
                compact
                bg={colors.red}
                onPress={() => remove(editing)}
              />
            </View>
          ) : null}
        </NeoCard>

        {query.loading && !query.data ? <NeoLoading /> : null}
        {query.error ? (
          <NeoError message={query.error} onRetry={query.retry} />
        ) : null}

        {query.data && goals.length === 0 ? (
          <NeoEmpty
            title="BELUM ADA TARGET"
            message="Mulai dari satu target kecil. Dana darurat atau liburan lebih mudah dikejar kalau angkanya terlihat."
          />
        ) : null}

        {goals.length > 0 ? (
          <View style={styles.section}>
            <NeoText variant="label">DAFTAR TARGET</NeoText>
            {goals.map((goal) => {
              const percent = goalProgressPercent(
                goal.savedAmount,
                goal.targetAmount,
              );
              const daysLeft = goalDaysLeft(goal.deadline, today);
              const reached = isGoalReached(
                goal.savedAmount,
                goal.targetAmount,
              );
              const deadlineText = reached
                ? "TARGET TERCAPAI"
                : daysLeft === null
                  ? "TANPA TENGGARA"
                  : daysLeft >= 0
                    ? `SISA ${daysLeft} HARI`
                    : `LEWAT ${Math.abs(daysLeft)} HARI`;

              return (
                <NeoSurface
                  key={goal.id}
                  bg={colors.white}
                  innerStyle={styles.goal}
                  offset={3}
                >
                  <View style={styles.rowBetween}>
                    <NeoText
                      variant="body"
                      numberOfLines={1}
                      style={styles.goalName}
                    >
                      {goal.name}
                    </NeoText>
                    <NeoText variant="label">{`${percent}%`}</NeoText>
                  </View>
                  <NeoProgress
                    value={goal.savedAmount / goal.targetAmount}
                    color={categoryColor(goal.color)}
                    height={16}
                    accessibilityLabel={`Progres ${goal.name}`}
                  />
                  <NeoText variant="mono" numberOfLines={1}>
                    {`${rp(goal.savedAmount)} / ${rp(goal.targetAmount)}`}
                  </NeoText>
                  <NeoText variant="small" color="#11111199">
                    {deadlineText}
                  </NeoText>

                  {fundingId === goal.id ? (
                    <View style={styles.funding}>
                      <NeoInput
                        label="TAMBAH DANA (RUPIAH)"
                        value={fundInput}
                        onChangeText={(value) =>
                          setFundInput(onlyDigits(value))
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        autoFocus
                      />
                      <View style={styles.fundingActions}>
                        <NeoButton
                          label="BATAL"
                          compact
                          offset={2}
                          bg={colors.white}
                          onPress={() => {
                            setFundingId(null);
                            setFundInput("");
                          }}
                        />
                        <NeoButton
                          label="SIMPAN DANA"
                          compact
                          offset={2}
                          bg={colors.green}
                          onPress={() => void addFunds(goal)}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.goalActions}>
                      <NeoButton
                        label="TAMBAH DANA"
                        compact
                        offset={2}
                        onPress={() => {
                          setFundingId(goal.id);
                          setFundInput("");
                          setError(null);
                          setNotice(null);
                        }}
                      />
                      <NeoButton
                        label="UBAH"
                        compact
                        offset={2}
                        bg={colors.white}
                        onPress={() => beginEdit(goal)}
                        accessibilityLabel={`Ubah target ${goal.name}`}
                      />
                    </View>
                  )}
                </NeoSurface>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
  section: { gap: spacing.sm },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  colorButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
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
  goal: { gap: spacing.sm, padding: spacing.md },
  goalName: { flex: 1 },
  goalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  funding: { gap: spacing.sm, marginTop: spacing.xs },
  fundingActions: { flexDirection: "row", gap: spacing.sm },
});
