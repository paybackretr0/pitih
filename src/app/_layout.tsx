import { SpaceGrotesk_400Regular } from "@expo-google-fonts/space-grotesk/400Regular";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono/400Regular";
import { SpaceMono_700Bold } from "@expo-google-fonts/space-mono/700Bold";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";

import { NeoText } from "@/components/neo/neo-text";
import { db } from "@/db/client";
import { processRecurring } from "@/db/recurring";
import { seedDatabase } from "@/db/seed";
import { getPeriodStart } from "@/db/settings";
import { todayISO } from "@/lib/format";
import { bumpData, useAppStore } from "@/store/app-store";
import { colors, spacing } from "@/theme";
import migrations from "../../drizzle/migrations";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  const { success: migrated, error: migrationError } = useMigrations(
    db,
    migrations,
  );
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const setPeriodStart = useAppStore((state) => state.setPeriodStart);

  useEffect(() => {
    if (!migrated || seeded) return;
    let active = true;

    (async () => {
      await seedDatabase();
      await processRecurring(todayISO()).catch(() => undefined);
      const start = await getPeriodStart();
      if (!active) return;
      setPeriodStart(start ?? todayISO());
      setSeeded(true);
    })().catch((error: unknown) => {
      if (active)
        setSeedError(
          error instanceof Error ? error.message : "Gagal menyiapkan data.",
        );
    });

    return () => {
      active = false;
    };
  }, [migrated, seeded, setPeriodStart]);

  const ready = fontsLoaded && seeded;
  const startupError =
    fontError?.message ?? migrationError?.message ?? seedError;

  useEffect(() => {
    if (ready || startupError) SplashScreen.hideAsync();
  }, [ready, startupError]);

  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active") return;
      processRecurring(todayISO())
        .then((count) => {
          if (count > 0) bumpData();
        })
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [ready]);

  if (startupError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          padding: spacing.xl,
          justifyContent: "center",
          gap: spacing.md,
        }}
      >
        <NeoText variant="title">APLIKASI GAGAL DIBUKA</NeoText>
        <NeoText variant="body">{startupError}</NeoText>
        <NeoText variant="small">
          Tutup lalu buka ulang aplikasi. Kalau masih gagal, data lokal mungkin
          perlu diperiksa.
        </NeoText>
      </View>
    );
  }

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="tambah"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="kategori"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="berulang"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="target"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="tertib"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>
    </>
  );
}
