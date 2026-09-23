import type { ConfigContext, ExpoConfig } from 'expo/config';

const ground = '#0b0a07';
const brand = '#ff6a39';
const googleMapsIosKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Resonance',
  slug: 'resonance',
  version: '0.1.0',
  scheme: 'resonance',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: ground,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.resonance.app',
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'Used to pick a profile photo.',
    },
    config: googleMapsIosKey ? { googleMapsApiKey: googleMapsIosKey } : undefined,
  },
  android: {
    package: 'com.resonance.app',
    adaptiveIcon: {
      backgroundColor: ground,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    ['expo-font', { fonts: [] }],
    ['expo-image-picker', { photosPermission: 'Used to pick a profile photo.' }],
    ['expo-notifications', { color: brand, defaultChannel: 'messages' }],
    ['expo-splash-screen', { image: './assets/splash-icon.png', resizeMode: 'contain', backgroundColor: ground }],
  ],
  experiments: {
    typedRoutes: true,
  },
});
