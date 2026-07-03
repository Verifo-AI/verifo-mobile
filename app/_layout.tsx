import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNotifications, registerPushToken, requestNotificationPermission } from "@/hooks/useNotifications";

const STORAGE_KEY = "verifo_settings";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function NotificationStarter() {
  useNotifications();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (raw) => {
      if (!raw) return;
      try {
        const settings = JSON.parse(raw);
        if (!settings.notificationsEnabled) return;
        const granted = await requestNotificationPermission();
        if (!granted) return;
        const walletAddr = settings.walletAddress ?? "";
        const nodeId = walletAddr.length >= 8
          ? `vf-node-${walletAddr.slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, "x")}`
          : "vf-node-new";
        await registerPushToken({
          notificationsEnabled: true,
          alertOnFailure: Boolean(settings.alertOnFailure),
          alertOnEarnings: Boolean(settings.alertOnEarnings),
          earningsThreshold: Number(settings.earningsThreshold) || 5,
          nodeId,
        });
      } catch {
      }
    });
  }, []);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <NotificationStarter />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
