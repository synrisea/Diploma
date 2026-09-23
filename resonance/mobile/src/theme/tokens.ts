export const colors = {
  stone: {
    50: '#0b0a07',
    100: '#141210',
    200: '#1f1c17',
    300: '#332e26',
    400: '#56503f',
    500: '#9c917f',
    600: '#b9ad98',
    700: '#d6ccbc',
    800: '#e8e0d2',
    900: '#f2ebe0',
  },
  ground: '#0b0a07',
  'ground-2': '#121009',
  panel: '#1c1811',
  brand: {
    50: '#2a1c12',
    100: '#3a2416',
    500: '#ff6a39',
    600: '#e2551f',
    700: '#a8320f',
    ink: '#1a0d05',
  },
  sentiment: {
    positive: '#4ad0c2',
    negative: '#ef5b4e',
    mixed: '#c9a15f',
  },
} as const;

export const fonts = {
  display: 'IBMPlexSerif_400Regular',
  displayMedium: 'IBMPlexSerif_500Medium',
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemibold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
} as const;

export const shadows = {
  panel: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  pill: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  brandGlow: {
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;
