// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  DEFAULT_CUSTOM_THEME_COLORS_DARK,
  DEFAULT_THEME_APPEARANCE,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";

// The pure-black, green-accent look the sibling apps ship — a Custom theme
// seeded from the dark palette with the page/surface slots pushed to black and
// the accent to the family's signature green. The app boots in this look; the
// Appearance settings tab can still swap to any preset.
export const APP_LOOK: ThemeAppearance = {
  ...DEFAULT_THEME_APPEARANCE,
  theme: "custom",
  customTheme: {
    colors: {
      ...DEFAULT_CUSTOM_THEME_COLORS_DARK,
      pageBg: "#000000",
      surface: "#0b0d10",
      surface2: "#111418",
      surface3: "#171b20",
      fg: "#c9ced6",
      fgBright: "#ffffff",
      muted: "#7c828d",
      line: "#23272e",
      accent: "#86efac",
      success: "#86efac",
    },
  },
};
