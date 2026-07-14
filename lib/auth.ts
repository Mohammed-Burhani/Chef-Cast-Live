/**
 * Authentication helpers for OAuth and deep linking
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Google OAuth using WebBrowser
 */
export async function signInWithGoogle() {
  try {
    const redirectUri = makeRedirectUri({
      scheme: 'chefcast-live',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No auth URL returned');

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUri
    );

    if (result.type === 'success') {
      const url = result.url;
      const params = new URL(url).searchParams;
      
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        return { success: true };
      }
    }

    return { success: false, cancelled: result.type === 'cancel' };
  } catch (error) {
    console.error('[Auth] Google sign-in error:', error);
    return { success: false, error };
  }
}

/**
 * Sign in with Apple (iOS only)
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token returned');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      return { success: false, cancelled: true };
    }
    console.error('[Auth] Apple sign-in error:', error);
    return { success: false, error };
  }
}

/**
 * Sign in anonymously (no email/password required)
 */
export async function signInAnonymously() {
  try {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          username: `Guest_${Date.now().toString().slice(-6)}`,
          cooking_level: 'beginner',
          onboarded_at: new Date().toISOString(),
        },
      },
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[Auth] Anonymous sign-in error:', error);
    return { success: false, error };
  }
}

/**
 * Handle deep link for magic link callback
 */
export async function handleDeepLink(url: string) {
  try {
    const { path, queryParams } = Linking.parse(url);
    
    // Magic link callback contains token_hash and type=magiclink
    if (queryParams?.token_hash && queryParams?.type === 'magiclink') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: queryParams.token_hash as string,
        type: 'magiclink',
      });

      if (error) throw error;
      return { success: true };
    }

    return { success: false };
  } catch (error) {
    console.error('[Auth] Deep link error:', error);
    return { success: false, error };
  }
}
