import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER_BODY, REMINDER_TITLE } from './reminder';

export const REMINDER_CHANNEL_ID = 'catat-harian';

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Pengingat catat',
    importance: AndroidImportance.DEFAULT,
  });
}

/**
 * Android 13 only shows the permission prompt after a channel exists, so the
 * channel is created before asking. Returns null when permission is refused.
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<string | null> {
  await ensureChannel();

  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted
    ? true
    : (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? REMINDER_CHANNEL_ID : undefined,
    },
  });
}

export async function cancelReminder(identifier: string | null): Promise<void> {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The system already dropped it (reinstall, reboot, user cleared data).
  }
}
