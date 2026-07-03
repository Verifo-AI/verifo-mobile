import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useEffect, useRef } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPrefs = {
  notificationsEnabled: boolean;
  alertOnFailure: boolean;
  alertOnEarnings: boolean;
  earningsThreshold?: number;
  nodeId?: string;
};

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function registerPushToken(prefs: NotificationPrefs): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await fetch(`${getBaseUrl()}/api/nodes/push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        nodeId: prefs.nodeId ?? "vf-node-0x4A2e",
        notificationsEnabled: prefs.notificationsEnabled,
        alertOnFailure: prefs.alertOnFailure,
        alertOnEarnings: prefs.alertOnEarnings,
        earningsThreshold: prefs.earningsThreshold ?? 5,
      }),
    });
  } catch {
  }
}

export async function unregisterPushToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await fetch(`${getBaseUrl()}/api/nodes/push-token`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
  }
}

export async function syncPushPrefs(prefs: NotificationPrefs): Promise<void> {
  if (!prefs.notificationsEnabled) {
    await unregisterPushToken();
  } else {
    await registerPushToken(prefs);
  }
}

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {});

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
