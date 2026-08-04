/**
 * Email-unsubscribe screen.
 *
 * Reached from the "Unsubscribe" link in the go-live email, either via the
 * app deep link `chefcast-live://email/unsubscribe` or the website route
 * `/email-unsubscribe`. Flips `profiles.email_notifications_enabled` off so
 * no further live-episode emails are sent.
 *
 * Also reachable directly for users who want to manage their preference —
 * the screen allows re-subscribing too.
 */

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

type State =
  | { kind: 'loading' }
  | { kind: 'not-logged-in' }
  | { kind: 'working' }
  | { kind: 'done'; optedOut: boolean }
  | { kind: 'error'; message: string };

export default function EmailUnsubscribeScreen() {
  const colors = useColors();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const [state, setState] = useState<State>({ kind: 'loading' });

  // Keep the screen in sync when the user signs in from the login redirect.
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !user) {
      setState({ kind: 'not-logged-in' });
      return;
    }
    setState({ kind: 'working' });
    applyPreference(false);
  }, [authLoading, isLoggedIn, user?.id]);

  async function applyPreference(optedOut: boolean) {
    try {
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ email_notifications_enabled: !optedOut })
        .eq('id', user.id);
      if (error) throw error;
      setState({ kind: 'done', optedOut });
    } catch (e) {
      setState({ kind: 'error', message: (e as Error)?.message ?? 'Something went wrong' });
    }
  }

  function goToApp() {
    // If we came from the (auth) group, go to tabs; otherwise just go back.
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {state.kind === 'loading' || state.kind === 'working' ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : null}

        {state.kind === 'not-logged-in' ? (
          <>
            <Feather name="mail" size={44} color={colors.mutedForeground} />
            <Text style={[styles.title, { color: colors.text }]}>Sign in to manage emails</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              To unsubscribe from live-episode emails, sign in to the account you received this
              email on, then open this link again.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>Sign in</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {state.kind === 'done' ? (
          <>
            <Feather
              name={state.optedOut ? 'bell-off' : 'bell'}
              size={44}
              color={colors.success}
            />
            <Text style={[styles.title, { color: colors.text }]}>
              {state.optedOut ? "You're unsubscribed" : 'Email alerts re-enabled'}
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {state.optedOut
                ? 'You will no longer receive emails when an episode goes live. Your in-app push notifications are unaffected.'
                : 'You will now receive an email whenever an episode goes live.'}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => applyPreference(!state.optedOut)}
            >
              <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>
                {state.optedOut ? 'Re-enable email alerts' : 'Turn email alerts off'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={goToApp}>
              <Text style={[styles.buttonLabel, { color: colors.text }]}>Back to the app</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {state.kind === 'error' ? (
          <>
            <Feather name="alert-circle" size={44} color={colors.danger} />
            <Text style={[styles.title, { color: colors.text }]}>Could not update preference</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{state.message}</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => applyPreference(false)}
            >
              <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>Try again</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
  button: {
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,194,0,0.25)' },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
});
