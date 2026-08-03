import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Feather, AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PushNotificationsProvider } from "@/components/PushNotificationsProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { handleDeepLink } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ToastProvider } from "@/utils/toast";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoggedIn, loading, user } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isAdmin = user?.role === 'admin';

    // Not logged in → force to auth
    if (!isLoggedIn && !inAuthGroup && segments[0] !== 'splash') {
      router.replace('/(auth)/login');
      return;
    }

    // Logged in, in auth group → route by role
    if (isLoggedIn && inAuthGroup) {
      router.replace(isAdmin ? '/(admin)' : '/(tabs)');
      return;
    }

    // Admin in user area → block
    if (isLoggedIn && isAdmin && inTabsGroup) {
      router.replace('/(admin)');
      return;
    }

    // User in admin area → block
    if (isLoggedIn && !isAdmin && inAdminGroup) {
      router.replace('/(tabs)');
      return;
    }
  }, [isLoggedIn, loading, user, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A0A2E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#E85200" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="leaderboard" options={{ presentation: "modal" }} />
      <Stack.Screen name="mystery-box" options={{ presentation: "modal" }} />
      <Stack.Screen name="scanner" options={{ presentation: "modal" }} />
      <Stack.Screen name="episode/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const { loadFromStorage } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
    ...AntDesign.font,
    ...Ionicons.font,
    ...MaterialIcons.font,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    loadFromStorage();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadFromStorage();
      } else if (event === 'SIGNED_OUT') {
        // State already cleared by logout(), just reload
        loadFromStorage();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => subscription.remove();
  }, []);

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
          <ToastProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <PushNotificationsProvider>
                  <RootLayoutNav />
                </PushNotificationsProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </ToastProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}