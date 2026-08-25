/**
 * useTypography hook - provides easy access to the typography system
 *
 * Usage:
 *   const { styles, fontFamily, fontSize, createStyle } = useTypography();
 *
 *   <Text style={styles.headlineLarge}>Title</Text>
 *   <Text style={createStyle('bold', 'lg', 600)}>Custom</Text>
 */

import { fontFamily, fontSize, lineHeight, letterSpacing, textStyles, getTextStyle, createTextStyle, type FontFamily, type FontSize, type TextStyleKey } from '@/constants/typography';

export function useTypography() {
  return {
    // Font families
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,

    // Predefined text styles
    styles: textStyles,

    // Helper functions
    getStyle: getTextStyle,
    createStyle: createTextStyle,
  };
}

export type {
  FontFamily,
  FontSize,
  TextStyleKey,
};

// Also export individual utilities for convenience
export { fontFamily, fontSize, lineHeight, letterSpacing, textStyles, getTextStyle, createTextStyle } from '@/constants/typography';