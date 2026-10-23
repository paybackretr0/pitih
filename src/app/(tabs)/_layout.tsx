import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoText } from '@/components/neo/neo-text';
import { border as borderTokens, colors, layout, spacing } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList asChild>
        <NeoBar>
          <TabTrigger name="beranda" href="/" asChild>
            <TabButton>BERANDA</TabButton>
          </TabTrigger>
          <TabTrigger name="transaksi" href="/transaksi" asChild>
            <TabButton>TRANSAKSI</TabButton>
          </TabTrigger>
          <AddButton />
          <TabTrigger name="statistik" href="/statistik" asChild>
            <TabButton>STATISTIK</TabButton>
          </TabTrigger>
          <TabTrigger name="pengaturan" href="/pengaturan" asChild>
            <TabButton>ATUR</TabButton>
          </TabTrigger>
        </NeoBar>
      </TabList>
    </Tabs>
  );
}

function NeoBar(props: TabListProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}>
      {props.children}
    </View>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const [focused, setFocused] = useState(false);
  // Expo Router types the slot ref against the View component type, which does not
  // match Pressable's instance ref. The ref is only used for focus plumbing here.
  const pressableProps = props as unknown as ComponentProps<typeof Pressable>;
  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.tab,
        isFocused && styles.tabActive,
        focused && styles.tabFocused,
        pressed && styles.tabPressed,
      ]}>
      <NeoText variant="label" numberOfLines={1} style={styles.tabLabel}>
        {children}
      </NeoText>
    </Pressable>
  );
}

function AddButton() {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Catat transaksi"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => router.push('/tambah')}
      style={({ pressed }) => [
        styles.addFrame,
        pressed && { transform: [{ translateX: 3 }, { translateY: 3 }] },
      ]}>
      {({ pressed }) => (
        <>
          {!pressed && <View pointerEvents="none" style={styles.addShadow} />}
          <View style={[styles.addFace, focused && styles.addFocused]}>
            <NeoText variant="title" style={styles.addLabel}>
              +
            </NeoText>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: borderTokens.width,
    borderTopColor: colors.ink,
  },
  tab: {
    flex: 1,
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: borderTokens.width,
    borderColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.yellow, borderColor: colors.ink },
  tabFocused: { borderColor: colors.blue },
  tabPressed: { backgroundColor: '#FFF0C9' },
  tabLabel: { fontSize: 10, lineHeight: 13 },
  addFrame: {
    width: 48,
    height: 48,
    marginTop: -18,
    paddingRight: 3,
    paddingBottom: 3,
  },
  addShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  addFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
  },
  addLabel: { lineHeight: 24 },
  addFocused: { borderColor: colors.blue },
});
