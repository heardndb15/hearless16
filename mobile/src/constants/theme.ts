export const GRADIENT_COLORS = ['#1565C0', '#42A5F5', '#E3F2FD'] as const;
export const GRADIENT_LOCATIONS = [0, 0.45, 1] as const;

export const Colors = {
  background: '#E3F2FD',
  card: 'rgba(255, 255, 255, 0.72)',
  accent: '#0288D1',
  button: '#0277BD',
  heading: '#0D47A1',
  dark: '#0A2E6E',
  sos: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  textPrimary: '#0D47A1',
  textSecondary: '#1E6FA8',
  border: 'rgba(255, 255, 255, 0.6)',
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

export const GlassCard = {
  backgroundColor: 'rgba(255, 255, 255, 0.72)',
  borderWidth: 1.5,
  borderColor: 'rgba(255, 255, 255, 0.6)',
  shadowColor: '#0288D1',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 20,
  elevation: 4,
} as const;
