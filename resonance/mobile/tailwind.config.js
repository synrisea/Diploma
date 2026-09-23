const { colors, fonts } = require('./src/theme/tokens.ts');

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: [fonts.display],
        'display-medium': [fonts.displayMedium],
        sans: [fonts.sans],
        'sans-medium': [fonts.sansMedium],
        'sans-semibold': [fonts.sansSemibold],
        mono: [fonts.mono],
        'mono-medium': [fonts.monoMedium],
        'mono-semibold': [fonts.monoSemibold],
      },
    },
  },
  plugins: [],
};
