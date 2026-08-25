/**
 * Patched Text component with default font family
 * Import this instead of react-native Text
 */
import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { fontFamily } from '@/constants/typography';

export function Text(props: TextProps) {
  return <RNText {...props} style={[styles.default, props.style]} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: fontFamily.regular,
  },
});

export default Text;
