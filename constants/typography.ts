/**
 * Typography system for Foodilicious Live
 *
 * Uses Poppins font family (loaded via @expo-google-fonts/poppins in app/_layout.tsx)
 * Provides consistent font family, size, weight, and line height across the app.
 */

// Font family names as loaded by @expo-google-fonts/poppins
export const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export type FontFamily = keyof typeof fontFamily;

// Font weight mapping to font family
export const fontWeightMap = {
  400: fontFamily.regular,
  500: fontFamily.medium,
  600: fontFamily.semiBold,
  700: fontFamily.bold,
} as const;

// Font size scale (in pixels)
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  '5xl': 36,
} as const;

export type FontSize = keyof typeof fontSize;

// Line height scale
export const lineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
} as const;

// Letter spacing scale
export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

// Predefined text styles for common use cases
export const textStyles = {
  // Display styles
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['5xl'],
    fontWeight: '700' as const,
    lineHeight: fontSize['5xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  displayMedium: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    fontWeight: '700' as const,
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  displaySmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['3xl'],
    fontWeight: '600' as const,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },

  // Headline styles
  headlineLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    fontWeight: '700' as const,
    lineHeight: fontSize['2xl'] * lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  headlineMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    fontWeight: '600' as const,
    lineHeight: fontSize.xl * lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  headlineSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    fontWeight: '600' as const,
    lineHeight: fontSize.lg * lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Title styles
  titleLarge: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    fontWeight: '500' as const,
    lineHeight: fontSize.lg * lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  titleMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    fontWeight: '500' as const,
    lineHeight: fontSize.md * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  titleSmall: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    fontWeight: '500' as const,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },

  // Body styles
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    fontWeight: '400' as const,
    lineHeight: fontSize.lg * lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    fontWeight: '400' as const,
    lineHeight: fontSize.md * lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontWeight: '400' as const,
    lineHeight: fontSize.sm * lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },

  // Label styles (for buttons, chips, etc.)
  labelLarge: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    fontWeight: '600' as const,
    lineHeight: fontSize.lg * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  labelMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    fontWeight: '600' as const,
    lineHeight: fontSize.md * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  labelSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    fontWeight: '600' as const,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },

  // Caption / overline styles
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    fontWeight: '400' as const,
    lineHeight: fontSize.xs * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  overline: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    fontWeight: '500' as const,
    lineHeight: fontSize.xs * lineHeight.normal,
    letterSpacing: letterSpacing.wider,
  },
} as const;

export type TextStyleKey = keyof typeof textStyles;

/**
 * Helper to get a text style by key, optionally overriding specific properties
 */
export function getTextStyle<K extends TextStyleKey>(
  key: K,
  overrides?: Partial<typeof textStyles[K]>
): typeof textStyles[K] {
  return { ...textStyles[key], ...overrides };
}

/**
 * Helper to create a text style with fontFamily and weight
 */
export function createTextStyle(
  family: FontFamily,
  size: FontSize,
  weight: keyof typeof fontWeightMap = 400,
  lineHeightMultiplier: keyof typeof lineHeight = 'normal',
  letterSpacingKey: keyof typeof letterSpacing = 'normal'
) {
  return {
    fontFamily: fontFamily[family],
    fontSize: fontSize[size],
    fontWeight: weight.toString(),
    lineHeight: fontSize[size] * lineHeight[lineHeightMultiplier],
    letterSpacing: letterSpacing[letterSpacingKey],
  };
}