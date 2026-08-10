export const colors = {
  background: '#F8F7F4',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFE9',
  text: '#1D2A24',
  textMuted: '#6B746E',
  primary: '#26715D',
  primaryDark: '#185343',
  primarySoft: '#DDEDE6',
  accent: '#EFAE54',
  border: '#E6E3DC',
  danger: '#B42318',
  dangerSoft: '#FCE8E6',
  success: '#16734D',
} as const;

export const radius = { small: 12, medium: 18, large: 26, pill: 999 } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 32,
} as const;

export const typography = {
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  cardTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
} as const;

export const touchTarget = 44;
