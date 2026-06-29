export const Colors = {
  background: '#FFFFFF',
  listBackground: '#F4F7FB',
  card: '#FFFFFF',
  border: '#E8EDF5',
  accent: '#1565C0',
  button: '#1565C0',
  heading: '#1A1A2E',
  secondary: '#9CA3AF',
  dark: '#1A1A2E',
  sos: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  textPrimary: '#1A1A2E',
  textSecondary: '#9CA3AF',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  caption: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  heading: 28,
  subtitleLarge: 36,
  hero: 48,
} as const;

export const Card = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 3,
} as const;

export const Header = {
  backgroundColor: '#1565C0',
  shadowColor: '#1565C0',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6,
} as const;
