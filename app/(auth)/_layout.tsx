/**
 * Auth stack layout — contains welcome and login screens.
 * No header shown; each auth screen handles its own UI.
 */

import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="check-email" />
    </Stack>
  );
}
