/**
 * Foodilicious Live brand color tokens.
 * Dark mode is the primary theme (kitchen lighting context).
 * Brand palette: Foodilicious gradient (#E85200 → #FFC200 → #FFE500) + Rigel red (#CC0000 / #E3000F).
 */

const colors = {
  light: {
    text: "#F5F5F5",
    tint: "#E85200",

    background: "#1A0A2E",
    foreground: "#F5F5F5",

    card: "#2A1040",
    cardForeground: "#F5F5F5",

    primary: "#E85200",
    primaryForeground: "#FFFFFF",

    secondary: "#2A1040",
    secondaryForeground: "#F5F5F5",

    muted: "#2A1040",
    mutedForeground: "#C8A860",

    accent: "#FFC200",
    accentForeground: "#1A0A2E",

    destructive: "#E3000F",
    destructiveForeground: "#FFFFFF",

    border: "rgba(255, 194, 0, 0.2)",
    input: "rgba(255, 194, 0, 0.2)",

    surface: "#2A1040",
    live: "#CC0000",
    neonRed: "#E3000F",
    success: "#FFC200",
    warning: "#FFE500",
    danger: "#E3000F",
  },

  dark: {
    text: "#F5F5F5",
    tint: "#E85200",

    background: "#1A0A2E",
    foreground: "#F5F5F5",

    card: "#2A1040",
    cardForeground: "#F5F5F5",

    primary: "#E85200",
    primaryForeground: "#FFFFFF",

    secondary: "#2A1040",
    secondaryForeground: "#F5F5F5",

    muted: "#2A1040",
    mutedForeground: "#C8A860",

    accent: "#FFC200",
    accentForeground: "#1A0A2E",

    destructive: "#E3000F",
    destructiveForeground: "#FFFFFF",

    border: "rgba(255, 194, 0, 0.2)",
    input: "rgba(255, 194, 0, 0.2)",

    surface: "#2A1040",
    live: "#CC0000",
    neonRed: "#E3000F",
    success: "#FFC200",
    warning: "#FFE500",
    danger: "#E3000F",
  },

  radius: 16,
  
  gradient: {
    primary: ["#E85200", "#FFC200"],
    full: ["#E85200", "#FFC200", "#FFE500"],
  },
};

export default colors;
