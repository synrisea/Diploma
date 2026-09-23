import Constants from 'expo-constants';

function metroHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split('://').pop()?.split('/')[0]?.split(':')[0]?.trim();
  return host && host.length > 0 ? host : null;
}

const host = process.env.EXPO_PUBLIC_API_HOST?.trim() || metroHost() || 'localhost';

function serviceUrl(port: number, override: string | undefined): string {
  return override?.trim() || `http://${host}:${port}`;
}

export const config = {
  apiHost: host,
  placesApiBaseUrl: serviceUrl(5112, process.env.EXPO_PUBLIC_API_BASE_URL),
  identityApiBaseUrl: serviceUrl(5076, process.env.EXPO_PUBLIC_IDENTITY_API_BASE_URL),
  feedbackApiBaseUrl: serviceUrl(5066, process.env.EXPO_PUBLIC_FEEDBACK_API_BASE_URL),
  topicsApiBaseUrl: serviceUrl(8010, process.env.EXPO_PUBLIC_TOPICS_API_BASE_URL),
  connectionsApiBaseUrl: serviceUrl(5122, process.env.EXPO_PUBLIC_CONNECTIONS_API_BASE_URL),
  googleMapsIosKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ?? '',
} as const;
