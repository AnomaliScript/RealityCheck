import { BebasNeue_400Regular, useFonts } from "@expo-google-fonts/bebas-neue";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { useActiveChallenge } from "@/features/session/useActiveChallenge";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const activeChallenge = useActiveChallenge();
  const router = useRouter();

  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  useEffect(() => {
    if (!isLoading && fontsLoaded) SplashScreen.hideAsync();
  }, [isLoading, fontsLoaded]);

  useEffect(() => {
    if (!user || !activeChallenge) return;
    router.push(`/challenge/${activeChallenge.id}`);
  }, [user, activeChallenge?.id]);

  if (isLoading || !fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="challenge/[id]"
          options={{
            presentation: "fullScreenModal",
            animation: "fade",
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="settings"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Settings",
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
