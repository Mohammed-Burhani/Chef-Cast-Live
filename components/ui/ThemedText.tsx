import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { fontFamily } from '@/constants/typography';

export interface ThemedTextProps extends RNTextProps {
  /** Use Sora font family instead of default Nunito (for headings) */
  heading?: boolean;
}

/**
 * Text component with default font family applied
 * Uses Nunito by default, Sora for headings
 */
export function ThemedText({ style, heading, ...props }: ThemedTextProps) {
  const defaultFont = heading ? fontFamily.soraRegular : fontFamily.regular;
  
  return (
    <RNText
      style={[{ fontFamily: defaultFont }, style]}
      {...props}
    />
  );
}
