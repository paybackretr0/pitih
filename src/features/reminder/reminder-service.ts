import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

import { REMINDER_BODY, REMINDER_TITLE } from "./reminder";

export const REMINDER_CHANNEL_ID = "catat-harian";

/**
 * Expo Go has no `ExpoTopicSubscriptionModule`, and `expo-notifications` imports
 * it the moment the package is required. Metro reports that failure through
 * `ErrorUtils` instead of throwing, so it used to crash the app with an
 * "Uncaught Error" overlay as soon as the settings route loaded.
 *
 * The package is now loaded on first use and never inside Expo Go, so a missing
 * native module only disables reminders instead of taking the app down.
 */
const UNAVAILABLE_MESSAGE =
  "Pengingat tidak tersedia di Expo Go. Pakai build aplikasi sendiri (npx expo run:android) untuk mengaktifkannya.";

type NotificationsModule = typeof import("expo-notifications");

let loaded: Promise<NotificationsModule | null> | null = null;

async function loadOnce(): Promise<NotificationsModule | null> {
  if (isRunningInExpoGo()) return null;
  try {
    // This has to sit inside an async function: on native, Metro's async require
    // can throw synchronously, and `.catch()` never sees that.
    const notifications = await import("expo-notifications");
    return typeof notifications.scheduleNotificationAsync === "function"
      ? notifications
      : null;
  } catch {
    return null;
  }
}

function loadNotifications(): Promise<NotificationsModule | null> {
  loaded ??= loadOnce();
  return loaded;
}

async function requireNotifications(): Promise<NotificationsModule> {
  const notifications = await loadNotifications();
  if (!notifications) throw new Error(UNAVAILABLE_MESSAGE);
  return notifications;
}

async function ensureChannel(notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== "android") return;
  await notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Pengingat catat",
    importance: notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Android 13 only shows the permission prompt after a channel exists, so the
 * channel is created before asking. Returns null when permission is refused.
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
): Promise<string | null> {
  const notifications = await requireNotifications();
  await ensureChannel(notifications);

  const current = await notifications.getPermissionsAsync();
  const granted = current.granted
    ? true
    : (await notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;

  return notifications.scheduleNotificationAsync({
    content: {
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === "android" ? REMINDER_CHANNEL_ID : undefined,
    },
  });
}

export async function cancelReminder(identifier: string | null): Promise<void> {
  if (!identifier) return;
  const notifications = await loadNotifications();
  if (!notifications) return;
  try {
    await notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The system already dropped it (reinstall, reboot, user cleared data).
  }
}
