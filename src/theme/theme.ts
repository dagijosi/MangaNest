export type ThemeMode = 'dark' | 'light' | 'system';

export interface ColorPalette {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  tabBarBackground: string;
  tabBarBorder: string;
  badgeBackground: string;
  overlay: string;
}

export const DarkTheme: ColorPalette = {
  background: '#121318',
  surface: '#1B1D24',
  surfaceElevated: '#242732',
  surfaceBorder: '#2E3240',
  textPrimary: '#F2F2F5',
  textSecondary: '#8E919D',
  textMuted: '#5D606D',
  accent: '#E9A45B',
  accentSoft: 'rgba(233, 164, 91, 0.14)',
  accentText: '#FFAE5E',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',
  success: '#4ADE80',
  warning: '#FBBF24',
  tabBarBackground: '#161820',
  tabBarBorder: '#232631',
  badgeBackground: '#2B2E3C',
  overlay: 'rgba(0, 0, 0, 0.72)',
};

export const LightTheme: ColorPalette = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F2F5',
  surfaceBorder: '#E1E4EA',
  textPrimary: '#121318',
  textSecondary: '#666A76',
  textMuted: '#969AA5',
  accent: '#D9822B',
  accentSoft: 'rgba(217, 130, 43, 0.12)',
  accentText: '#C06F1E',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  success: '#22C55E',
  warning: '#F59E0B',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E6E8EE',
  badgeBackground: '#EDEFF3',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;
