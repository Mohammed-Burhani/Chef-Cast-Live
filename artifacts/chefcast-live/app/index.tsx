/**
 * Root index — redirects to the appropriate route based on auth state.
 * Logged in → tabs home
 * Not logged in → auth welcome
 */

import { Redirect } from "expo-router";

import { useAuthStore } from "@/store/useAuthStore";

export default function Index() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  if (isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
