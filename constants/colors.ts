/**
 * Foodilicious Live brand color tokens.
 *
 * Light theme is now the primary palette: white background with white-shade
 * cards, foreground in near-black for legibility. Red (Rigel red) and gold are
 * the prominent brand colors — red drives primary actions / live states, gold
 * drives accents, dividers and the brand gradient.
 *
 * Brand palette: Foodilicious gradient (#E85200 → #FFC200 → #FFE500) +
 * Rigel red (#CC0000 / #E3000F).
 */

// Shared white-theme tokens. Both `light` and `dark` resolve to this so the
// home screen and bottom nav are reliably white regardless of device appearance.
const whiteTheme = {
  text: "#1A1A1A",
  tint: "#E3000F",

  background: "#FFFFFF",
  foreground: "#1A1A1A",

  card: "#F7F7F8",
  cardForeground: "#1A1A1A",

  primary: "#E3000F",
  primaryForeground: "#FFFFFF",

  secondary: "#F2F2F3",
  secondaryForeground: "#1A1A1A",

  muted: "#F2F2F3",
  mutedForeground: "#6B6B6B",

  // Deeper gold so text stays legible on white; bright brand gold lives in
  // the `gradient` tokens and is used for fills/decoration.
  accent: "#D4A017",
  accentForeground: "#1A1A1A",

  destructive: "#E3000F",
  destructiveForeground: "#FFFFFF",

  border: "rgba(200, 150, 0, 0.22)",
  input: "rgba(200, 150, 0, 0.22)",

  surface: "#F7F7F8",
  live: "#CC0000",
  neonRed: "#E3000F",
  success: "#FFC200",
  warning: "#FFE500",
  danger: "#E3000F",

  // Haier sponsor colors
  haierRed: "#CC0000",
  haierRedLight: "rgba(204,0,0,0.1)",
  haierGold: "#D4A017",
};

const colors = {
  light: { ...whiteTheme },

  dark: { ...whiteTheme },

  radius: 16,
  
  gradient: {
    primary: ["#E85200", "#FFC200"],
    full: ["#E85200", "#FFC200", "#FFE500"],
  },
};

export default colors;
