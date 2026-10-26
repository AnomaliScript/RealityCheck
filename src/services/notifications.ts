import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const supported = Platform.OS !== "web";

// While the app is open, skip the banner: the app jumps to the challenge itself.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let askedThisSession = false;

/** iOS only shows the permission prompt the first time; later calls just check. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (askedThisSession) return false;
  askedThisSession = true;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return result.granted;
}

// There is only ever one pending "challenge time" reminder per phone.
let scheduledId: string | null = null;
let scheduledFor = 0;
let clearedStale = false;

// Run scheduling calls one at a time so two can't overlap and double-schedule.
let chain: Promise<void> = Promise.resolve();
function serial(task: () => Promise<void>): Promise<void> {
  chain = chain.then(task).catch((e) => console.warn("notifications", e));
  return chain;
}

async function cancelNow() {
  if (!scheduledId) return;
  const id = scheduledId;
  scheduledId = null;
  scheduledFor = 0;
  await Notifications.cancelScheduledNotificationAsync(id);
}

/** Schedules (or moves) this phone's reminder for when the next challenge is due. */
export function scheduleChallengeReminder(at: number): Promise<void> {
  if (!supported) return Promise.resolve();

  return serial(async () => {
    // A reminder left over from before the app was closed would double-buzz.
    if (!clearedStale) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      clearedStale = true;
    }

    // Already set for this moment: nothing to change.
    if (scheduledId && Math.abs(scheduledFor - at) < 1000) return;

    await cancelNow();
    if (!(await ensureNotificationPermission())) return;

    scheduledId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your next RealityCheck's ready!",
        body: "Open the app to see a new challenge and check in with your friends.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Math.max(at, Date.now() + 5000)),
      },
    });
    scheduledFor = at;
  });
}

export function cancelChallengeReminder(): Promise<void> {
  if (!supported) return Promise.resolve();
  return serial(cancelNow);
}
