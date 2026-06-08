/**
 * Root layout — wraps the entire app with providers.
 * Loads Poppins font, initializes auth, handles deep links, and protects routes.
 * Providers: SafeAreaProvider → ErrorBoundary → QueryClient → GestureHandler → Keyboard
 */

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Feather, AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/store/useAuthStore";
import { handleDeepLink } from "@/lib/auth";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoggedIn, loading } = useAuthStore();

  // Auth-based routing
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isLoggedIn && !inAuthGroup && segments[0] !== 'splash') {
      // Not signed in, redirect to auth
      router.replace('/(auth)/welcome');
    } else if (isLoggedIn && inAuthGroup) {
      // Signed in but in auth screens, redirect to app
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, loading, segments]);

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A0A2E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#E85200" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="splash" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="leaderboard" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="mystery-box" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="scanner" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="episode/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { loadFromStorage } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    // Explicitly load icon fonts so Android resolves them correctly
    ...Feather.font,
    ...AntDesign.font,
    ...Ionicons.font,
    ...MaterialIcons.font,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Initialize auth once on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Handle deep links for magic link callback
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened via deep link
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
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
