# Mobile App (React Native) — Design Doc

Status: **design, not implemented.** Written 2026-09-22.

Goal as set: a React Native app with **full parity** to the web app — same features, same UI — sharing the
existing backend unchanged. The API layer is **duplicated** into the mobile project rather than extracted
into a shared package, so the working web app is not restructured.

Everything inventoried below is from the live `frontend/` source, not assumed: 10 routes, 27 components,
41 hooks, 8 dependencies.

## 0. Why React Native rather than Next.js or a PWA

Next.js was considered and rejected: it is a web meta-framework (SSR, routing, bundling). It produces a
website, so it does not deliver a mobile app; adopting it would mean rewriting routing and build tooling
for no mobile benefit. Its real draw, SSR/SEO, is irrelevant to a logged-in map app.

A responsive PWA was the cheaper option (days rather than weeks, one codebase). It was rejected in favour
of native for one concrete reason: **push notifications**. Messaging is polling-only, and a PWA on iOS
cannot wake the user for a new message. That is the single capability that justifies a second frontend,
and it should be built (§9) — otherwise the extra codebase buys little.

**The honest cost, recorded up front:** this is a second frontend, not a port. Every screen is rebuilt in
native primitives, the map is rebuilt on a different engine, and from then on every feature is built
twice. The pixel-identical goal is achievable for layout, type and colour; it is *not* achievable for
the map, and §5 says exactly where it breaks.

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (managed)** | No Android SDK or Java on this machine, so no local emulator. Expo Go on a physical phone over Wi-Fi is the only practical loop here, and it avoids native build toolchains entirely |
| Navigation | **Expo Router** | File-based routing that maps almost one-to-one onto the existing `react-router` paths (§3), including the dynamic segments |
| Styling | **NativeWind v4** | Tailwind class names in RN. This is what makes "same UI" realistic — the existing markup uses Tailwind utilities throughout, so classes largely transfer verbatim instead of being hand-translated to `StyleSheet` objects |
| Data | **TanStack Query** | Already used by the web app and runs unchanged on RN. All 41 hooks port with only the fetch layer beneath them changing |
| Maps | **react-native-maps** | The only mature option. Google Maps on Android, Apple Maps on iOS |
| Token storage | **expo-secure-store** | Keychain / Keystore. `localStorage` does not exist, and `AsyncStorage` is unencrypted — refresh tokens are 30-day credentials and belong in secure storage |
| Push | **expo-notifications** | §9 |

Everything else (fonts, images, clipboard) uses the matching Expo module.

## 2. Project layout

```
mobile/
  app/                       Expo Router routes (§3)
  src/
    api/                     duplicated from frontend/src/api, fetch layer swapped
    hooks/                   duplicated, unchanged where possible
    components/              rebuilt in RN primitives
    auth/AuthContext.tsx     same shape, SecureStore instead of localStorage
    theme/tokens.ts          the design tokens, as JS
```

The web app is not touched.

**Duplication is a deliberate, costed choice.** Types and API clients will exist twice, and an endpoint
change means editing both. Accepted to avoid restructuring a working web app into a monorepo mid-project.
If drift becomes a real problem, the escape hatch is extracting `api/` and `types/` into a workspace
package later — the file layout above keeps that boundary clean so the move stays cheap.

## 3. Route mapping

The web app's routes map directly:

| Web (`react-router`) | Mobile (Expo Router) | Notes |
|---|---|---|
| `/` | `app/(tabs)/index.tsx` | Map. Becomes the first tab |
| `/login` | `app/login.tsx` | Also the unauthenticated landing screen |
| `/settings` | `app/settings.tsx` | |
| `/users/:id` | `app/users/[id].tsx` | |
| `/inbox` | `app/(tabs)/inbox.tsx` | Tab, with the unread badge |
| `/friends` | `app/(tabs)/friends.tsx` | Tab |
| `/plans` | `app/(tabs)/plans.tsx` | Tab |
| `/messages/new` | `app/messages/new.tsx` | Takes `with` and `intentId` params |
| `/messages/:conversationId` | `app/messages/[conversationId].tsx` | |
| `/admin` | `app/admin/index.tsx` | Not a tab — reached from Settings (§7) |
| `/auth/callback` | handled by deep link | §8 |

**Navigation model changes, and this is the one intentional UI divergence.** The web app puts Inbox,
Plans, Friends, Admin and Settings behind icons in a top header. On a phone that is wrong — those are
primary destinations and belong in a bottom tab bar, which is also where every user expects them.
Proposal: four tabs (**Map, Inbox, Friends, Plans**) with Settings and Admin reached from the profile
menu. The header's icon row is kept only where it carries meaning, such as the unread badge moving onto
the Inbox tab.

Everything else keeps the web app's structure, including the project's **no-modals** convention: chat,
inbox and review are full screens there and stay full screens here.

## 4. Design system port

The tokens in `frontend/src/index.css` move to `theme/tokens.ts` unchanged and feed the NativeWind config,
so the palette is identical by construction:

- Ground `#0b0a07`, panel `#1c1811`, brand `#ff6a39`, brand-ink `#1a0d05`
- The full `stone-*` ramp (50 darkest → 900 lightest — note the scale is inverted for this dark theme)
- Sentiment: positive `#4ad0c2`, negative `#ef5b4e`, mixed `#c9a15f`

**Fonts**: IBM Plex Serif (display), Sans (body), Mono (the uppercase micro-labels). Loaded through
`expo-font` / `@expo-google-fonts/ibm-plex-*`. The monospace uppercase `tracking-[0.2em]` label style is
a signature of this UI and must survive; letter-spacing works in RN.

**What does not translate, and the substitute:**

| Web | Mobile |
|---|---|
| `backdrop-blur-md` on the header/panels | `expo-blur` `BlurView` |
| `box-shadow` (`shadow-[0_16px_40px...]`) | iOS `shadowOffset/Opacity/Radius`; Android only has `elevation`, so the long soft glows will be approximations |
| CSS `@keyframes` (`resonance-pulse`, `signal-ring-pulse`) | `react-native-reanimated` loops |
| `:hover` states | Dropped. Touch has no hover — use `Pressable` pressed states instead |
| `.app-grain` overlay texture | A tiled `ImageBackground` at low opacity |

## 5. The map — where parity genuinely breaks

This is the largest single piece of work and the place to set expectations honestly.

`MapView`, `ClusterGroup`, `HeatmapLayer`, `HeatmapControl`, `RoutePolyline`, `RouteStopMarkers` and
`MapResizeHandler` are all Leaflet-specific and **cannot be ported** — they are rewritten against
`react-native-maps`.

| Feature | Web | Mobile |
|---|---|---|
| Base map | CARTO dark raster tiles | Google/Apple map styled dark via a style JSON. **Will not look identical** — closest achievable, not the same |
| Markers | `leaflet.markercluster`, category-coloured | `react-native-maps` `Marker` + its clustering, custom marker views |
| Heatmap | `leaflet.heat`, two overlaid red/green layers, weights normalized 0..1 | `react-native-maps` `Heatmap` (Google only). **Apple Maps has no heatmap**, so on iOS this needs either a Google provider or the feature disabled |
| Route polyline | CSS `stroke-dashoffset` (`@keyframes route-leg-draw`), drawn leg by leg | `Polyline` + Reanimated. The leg-by-leg draw is reproducible but is a rewrite, not a port |
| Sidebar / detail | Collapsible panel, overlay under `md:` | Bottom sheet (`@gorhom/bottom-sheet`) — the correct phone pattern and already close to the existing mobile overlay |

`MapPage` already has real mobile handling (overlay sidebar, a bottom pill bar under `md:hidden`), so the
interaction model is understood; the rendering layer is what changes.

**Decide before building**: iOS heatmap. Either ship Google Maps on both platforms (consistent, needs an
API key) or accept the heatmap is Android-only. This is a real product decision, not a detail.

## 6. Screen-by-screen inventory

Every screen, with the specific thing that makes it non-trivial.

| Screen | Ports cleanly | Needs attention |
|---|---|---|
| **Map** | — | Entire map layer (§5); place list becomes a bottom sheet |
| **Place detail** | Tags, summary, comments, visit intents | Photo thumbnails → `expo-image`; `PhotoLightbox` → a full-screen viewer with pinch-zoom |
| **Login / Register** | Form, validation, errors | Google sign-in is a different flow entirely (§8) |
| **Settings** | Profile fields, the sticky Save/Cancel bar, sessions, friends | `AvatarCropper` uses `document.createElement('canvas')` + `toBlob` — **no DOM in RN**. Replace with `expo-image-picker` (which has built-in cropping) + `expo-image-manipulator` |
| **Inbox** | List, unread badges, relative times | Pull-to-refresh replaces polling-only refresh |
| **Conversation** | Bubbles, send, block states | `KeyboardAvoidingView` (different behaviour per platform); `FlatList` inverted for chat; auto-scroll replaces `scrollIntoView` |
| **Friends** | Search, requests, friends list, icon actions | Debounce search — every keystroke currently fires a query, which is worse on mobile data |
| **Plans** | List, cancel | — |
| **User profile** | Avatar, bio, interests, stats, comment history | — |
| **Visit intents** | Date + free-text plan | `<input type="date">` does not exist → `@react-native-community/datetimepicker` |
| **Admin** | Review queue, topics, dimensions, content, pipeline, audit | Keyboard shortcuts (`1`/`2`/`3`/`S`/Enter) are meaningless on a phone → large tap targets instead. Admin on mobile is low value; build last (§10) |

Non-obvious ports also needed: `HeaderDropdown` → `@gorhom/bottom-sheet` or ActionSheet; `BackLink` →
the navigator's own back handling plus Android's hardware back button; `useMediaQuery` → `useWindowDimensions`.

## 7. Auth

`AuthContext` keeps its exact shape (`accessToken`, `refreshToken`, `getValidAccessToken()`, the 30-second
refresh skew) with two changes:

1. **Storage**: `localStorage` → `expo-secure-store`. Note this makes hydration **async** — the web version
   reads synchronously in `useState(loadStoredAuth)`. The app needs a loading state on launch, or it will
   flash the login screen at every cold start for a signed-in user.
2. **No CORS.** Native apps are not bound by it, so the services need no config change for mobile.

## 8. Google sign-in — genuinely different

The web flow redirects to `/api/auth/google/start`, Google redirects back to `/auth/callback`, and the
page exchanges a handoff code. **There is no browser redirect to catch in a native app.**

Replacement: `expo-auth-session` / `expo-web-browser` opens the system browser, and the result returns to
the app via a deep link (`resonance://auth/callback`). This requires:

- a custom URL scheme registered in `app.json`
- the redirect URI added to the Google Cloud OAuth client (native clients have their own type)
- `Identity:PublicBaseUrl` reachable from the phone, not `localhost`

Email/password login needs none of this and should be built first; Google sign-in is the fiddlier path.

## 9. Push notifications — the reason for going native

Without this, the mobile app is a slower PWA. Design:

1. Register for a push token with `expo-notifications` on login; send it to the backend.
2. **New**: a `DeviceTokens` table in connections-service (user id, token, platform, created), and a
   delete on logout.
3. `SendMessageHandler` sends a push to the recipient's devices after persisting a message — but only if
   the recipient is not the sender, respecting existing block rules.
4. Tapping the notification deep-links to that conversation.

Delivery goes through Expo's push service. This is the one place the **backend changes** for mobile;
everything else reuses the existing API as-is.

Unread counts stay polling-based in-app — push is for when the app is closed, not a replacement for the
badge logic that already works.

## 10. Build order

| Phase | Contents | Why here |
|---|---|---|
| 0 | Expo app, NativeWind, tokens, fonts, tab navigator, API base URL config | Nothing renders correctly until the design system is in place |
| 1 | Auth (email/password), SecureStore, launch loading state | Everything else needs a token |
| 2 | Map + markers + place detail bottom sheet | The biggest risk; do it early while there's room to change approach |
| 3 | Comments, tags, summaries, visit intents | Reuses phase 2's sheet |
| 4 | Inbox, conversation, friends, plans | The screens that port most cleanly |
| 5 | Push notifications + backend `DeviceTokens` | Needs conversations working first |
| 6 | Heatmap, route planning + animated polyline | Highest effort, lowest phone value — genuinely useful but not what a demo opens with |
| 7 | Settings (avatar picker), Google sign-in, admin | The fiddly long tail |

Phase 2 is the go/no-go point: if `react-native-maps` cannot carry the interaction model, that is worth
knowing before another five phases are built on top of it.

## 11. Testing

Same approach as the rest of the project — real device, real backend, no mocks. Expo Go on the phone,
services reached at `http://192.168.1.101:<port>` over Wi-Fi. Windows Firewall must allow inbound on
5066/5076/5112/5122/8010, and the API base URL must be configurable rather than hardcoded, because that
address changes with the network.

Worth stating plainly: **there are still no automated tests in this project**, and a second frontend
doubles the surface that is verified only by hand.

## 12. Open questions

- **iOS heatmap** (§5) — Google provider on both platforms, or Android-only heatmap?
- **Is the admin panel wanted on mobile at all?** Full parity was the stated goal, but reviewing topic
  labels on a phone is worse than on a laptop in every respect. Phase 7 is late enough to drop it without
  waste if the answer turns out to be no.
- **Offline behaviour.** Currently undefined. A map app with no signal is a plausible real scenario;
  TanStack Query can persist its cache, but this is a feature to decide on, not a default.
- **Expo Go limits.** Push notifications and custom URL schemes may need a development build rather than
  plain Expo Go, which reintroduces the native toolchain this stack was chosen to avoid. Verify before
  phase 5, not during it.
