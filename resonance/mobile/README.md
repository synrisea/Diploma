# Resonance Mobile

React Native (Expo) client with feature parity to `frontend/`. Design and decisions: `../docs/mobile-app-design.md`.

## Run on a phone (Expo Go)

1. Install Expo Go on the phone and put it on the same network as this machine.
2. Copy `.env.example` to `.env`. Leave `EXPO_PUBLIC_API_HOST` empty and the app takes the host from the
   Metro dev server it loaded from, so it follows this machine's address automatically when the LAN
   address changes (switching Wi-Fi to Ethernet, a new DHCP lease). Set it explicitly only to point at a
   different backend. All five services are derived from that host (`5112`, `5076`, `5066`, `8010`,
   `5122`); a per-service `EXPO_PUBLIC_*_API_BASE_URL` overrides one of them.

   `EXPO_PUBLIC_*` values are inlined at bundle time, so after editing `.env` restart with `npx expo start -c`.
3. Allow inbound TCP on `5066 5076 5112 5122 8010` in Windows Firewall, or the phone cannot reach the backend.
4. Start the backend (`docker compose up` in `../infra`), then:

```
npm install
npm start
```

Scan the QR code from Expo Go. `npm run typecheck` runs `tsc`.

## Layout

```
app/                Expo Router routes (tabs: Map, Inbox, Friends, Plans; stack: login, settings, users/[id], messages/*, admin)
src/api, src/types  duplicated from frontend/src; only the base URL source and the upload file shape differ
src/hooks           duplicated from frontend/src/hooks (41 hooks) + useDebouncedValue, usePushNotifications
src/auth            AuthContext (SecureStore, async hydration) and the Google sign-in flow
src/components      rebuilt in RN primitives; src/components/ui is the shared kit (Text, Input, buttons, Avatar…)
src/theme/tokens.ts design tokens; tailwind.config.js reads them
```

## Google sign-in

The app opens `/api/auth/google/start?returnTo=<app url>` in the system browser and the identity service
redirects back to that URL with the handoff code. For that to work:

- `Google:RedirectUri` in identity-service must be reachable from the phone (LAN address, not `localhost`)
  and registered in the Google Cloud OAuth client.
- `Identity:MobileReturnSchemes` (default `resonance,exp`) lists the schemes the service will redirect to.
  `exp://` is what Expo Go uses; `resonance://` is the built app.

## Push notifications

Registration runs on login and needs a development build (Expo Go on Android does not receive remote
pushes) and an EAS project id (`npx eas init`, which writes `extra.eas.projectId`). Without either, the app
silently skips registration and everything else works. Tokens go to `PUT /api/connections/devices`; the
connections service sends through Expo's push API when a message is persisted.

## Maps

Android uses Google Maps (bundled in Expo Go). iOS uses Apple Maps unless `EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY`
is set, which requires a development build. The heatmap uses the native `Heatmap` on Google and falls back to
translucent circles on Apple Maps.
