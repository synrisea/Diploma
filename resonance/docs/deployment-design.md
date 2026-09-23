# Deployment — Self-Hosted on the Development Laptop

Status: **design, not implemented.** Written 2026-09-23.

Constraint set by the project: **everything runs on this laptop.** No cloud hosting, no managed database,
no external VM. The only outside services involved are DNS, Let's Encrypt (certificates), and — if push
notifications are kept — Expo's push relay. Each of those is called out where it appears.

## 0. What "deployed" has to mean here

Today the app runs only for someone sitting at this machine, on `http://localhost:*`, with five services
on five ports and a Vite dev server. "Deployed" means:

1. One HTTPS origin, reachable from outside the flat, on a name that isn't an IP address.
2. Survives a reboot and runs unattended — no terminal left open, no `npm run dev`.
3. Google sign-in works on web **and** phone.
4. The mobile app is installable on a phone that is not on this Wi-Fi.
5. The database survives redeploys and is backed up somewhere other than the container.

Explicitly **not** in scope: high availability, horizontal scaling, zero-downtime deploys. One laptop is
one point of failure and this document does not pretend otherwise (§9).

## 1. The machine, as measured

| | |
|---|---|
| GPU | NVIDIA RTX 5070 Laptop (plus AMD 610M integrated) — CUDA available, so topics-service can keep its GPU build |
| RAM | 31.2 GB |
| OS | Windows 11 Pro, Docker Desktop on WSL2 |
| Public IP | `37.61.x.x` — **publicly routable, not CGNAT**, so port forwarding is possible |
| Router | gateway `192.168.1.254`, network `ALHN-E466` |
| LAN address | `192.168.1.100` (Ethernet). A stale `192.168.1.101` lease is still bound to the disconnected Wi-Fi adapter |
| Ports 80/443 | nothing listening locally |
| Android toolchain | **no Java, no Android SDK installed** |

The routable public IP is the single most important finding: it means a real domain with a real Let's
Encrypt certificate is achievable, which in turn unblocks Google sign-in everywhere. Had this been CGNAT,
the only route would have been a third-party tunnel.

## 2. Current problems

Everything below was verified against the working tree, not assumed.

### 2.1 The frontend container runs a dev server

`frontend/Dockerfile` ends with `CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]`. That is the Vite
development server: unminified, source-mapped, with a hot-reload websocket, and explicitly not intended to
face the internet. There is no production build anywhere in the pipeline.

**Fix:** multi-stage Dockerfile — `npm run build`, then serve the static `dist/` from the reverse proxy.

### 2.2 The frontend has five backend origins baked in at build time

`frontend/.env` sets five separate `VITE_*` base URLs. Vite **inlines** these at build time, so they are
frozen into the JavaScript bundle. The image is therefore environment-specific: every hostname change
means a rebuild, and the app can never be moved without one.

**Fix:** once everything is same-origin behind one proxy (§3), these become relative paths and the
variables disappear entirely.

### 2.3 CORS allow-lists are hardcoded to `localhost:5173`

Four services hardcode the origin in C#:

```
connections-service/Resonance.Connections.Api/Program.cs:44
feedback-service/Resonance.Feedback.Api/Program.cs:27
identity-service/Resonance.Identity.Api/Program.cs:48
places-service/Resonance.Places.Api/Program.cs:20
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
```

Only topics-service is configurable, via `FRONTEND_CORS_ORIGINS` (`main.py:21`). So four of five services
need a **code change** for any new origin.

**Fix:** same-origin behind the proxy removes the need for CORS at all. Make the C# lists configurable
anyway, so a future split-origin setup doesn't need a recompile.

### 2.4 No HTTPS anywhere

Every service speaks plain HTTP on its own port. Passwords, JWTs and refresh tokens currently cross the
network in clear text. On a LAN that was tolerable; on the public internet it is not, and Google will not
accept a non-HTTPS redirect URI regardless.

### 2.5 Google OAuth is pinned to localhost

`identity-service/.../appsettings.Development.json`:

```json
"Identity": { "PublicBaseUrl": "http://localhost:5076", "FrontendBaseUrl": "http://localhost:5173" },
"Google":   { "RedirectUri": "http://localhost:5076/api/auth/google/callback" }
```

This is exactly why Google sign-in fails on the phone today. All three become the public HTTPS origin, and
the new URI must be registered in the Google Cloud console.

### 2.6 There is no production configuration

`appsettings.json` (the non-Development file) contains only `Logging` and `AllowedHosts`. Every meaningful
setting — `Jwt:Secret`, `Jwt:Issuer`, `Identity:PublicBaseUrl`, `Google:*`, `Resend`, `Email` — exists
**only** in `appsettings.Development.json`, and `infra/docker-compose.yml` sets
`ASPNETCORE_ENVIRONMENT: Development` for every service.

This is a trap: flipping to `Production` without doing anything else makes the services fail at startup on
the first missing key. Running as `Development` in production instead means developer exception pages
leaking stack traces to the internet.

**Fix:** supply all of it through environment variables in compose (which already overrides config keys via
the `Section__Key` convention), then switch to `Production`.

### 2.7 Secrets are committed to the repository

`Jwt:Secret` is the literal string `xYGP6Eb2bk4JXl0o0OPCqowtMuyG0cp6`, in git, duplicated into every
service that validates tokens. Anyone with the repository can mint valid access tokens for any user id.

**Fix:** generate a new secret, inject it from `infra/.env` (already gitignored), and treat the committed
one as burned — it must not be reused.

### 2.8 Migrations are manual, per service

`dotnet ef database update` has to be run by hand for identity, feedback, connections and places. Nothing
runs them on container start. A deploy that ships a new migration and forgets this step leaves the service
running against a schema it does not match.

### 2.9 Postgres is exposed and unbacked

`5432:5432` publishes the database to the host — and, once the firewall opens for the proxy, potentially
further. Data lives in the `resonance_postgres_data` volume with no dump, no schedule, no off-machine copy.

### 2.10 `ADMIN_USER_IDS` is duplicated

Both topics-service and feedback-service read it independently. Two places to edit, and they can drift.

### 2.11 MediatR licensing

MediatR 13+ requires a paid licence for production use; the project is on the free dev/test tier, in four
services. "Deployed and publicly reachable" is the point where that stops being a theoretical question.
Options unchanged: buy the licence, pin to 12.x (MIT), or drop MediatR for direct DI.

### 2.12 The topics image is 23 GB and its GPU mode is a build argument

`BASE_IMAGE` / `LLAMA_CMAKE_ARGS` decide CPU vs CUDA **at build time**, and `docker compose up` will not
rebuild when those arguments change — it silently reuses whatever image exists. This already caused a
crash-loop (`libcuda.so.1: cannot open shared object file`) when the GPU image was started without the GPU
override. Any deploy procedure has to state which compose file combination is used, every time.

The GPU is genuinely required for usable latency: ~35 s per route-planning request on CPU versus
~0.2–0.4 s on GPU.

### 2.13 Laptop realities

- **Sleep and lid close** suspend every container. A laptop acting as a server must never sleep.
- **The LAN address moves.** This already broke the mobile app once: the `.env` pinned `192.168.1.101` while
  the machine had moved to Ethernet on `192.168.1.100`.
- **Docker Desktop must be running** — it does not start containers before login unless configured to.
- **The public IP is dynamic** on a home connection, so DNS has to be updated when it changes.
- **The network profile is Public**, which blocks inbound by default; the proxy ports need explicit rules.

### 2.14 The mobile app cannot currently be built for distribution

- **No JDK, no Android SDK on this machine.** `expo run:android` and `eas build --local` both need them.
- **iOS is out of reach**: a signed `.ipa` needs macOS and a paid Apple Developer account. Neither exists.
- **Expo Go is not distribution.** It needs Metro running on the laptop and cannot receive push.
- **Push depends on Expo's relay** (`exp.host`), which is an external service by design.
- The new `hostUri` auto-detection only works in development, where Metro tells the app where it came from.
  A release build has no Metro, so its backend URL must be set at build time.

## 3. Target architecture

One reverse proxy owns ports 80 and 443. Everything else stops being published to the host and talks over
the internal compose network.

```
                Internet
                   │  :80 / :443
          ┌────────▼─────────┐
          │  router          │  port-forward 80,443 → 192.168.1.100
          └────────┬─────────┘
                   │
          ┌────────▼─────────┐
          │  Caddy           │  automatic Let's Encrypt, single origin
          └───┬─────┬────┬───┘
   static /   │     │    │  /api/*
  dist files ─┘     │    └──────────────┐
                    │                   │
   ┌────────────────┼───────────┬───────┴────┬──────────────┐
   ▼                ▼           ▼            ▼              ▼
 places:8080   identity:8080  feedback:8080  connections:8080  topics:8001
   └──────────────┴───────────┴────────────┴──────────────┘
                              │
                        postgres:5432   (internal only, not published)
```

Same origin means **no CORS**, one set of cookies/headers, one certificate, and one URL to configure in
Google Cloud and in the mobile build. It also happens to be the API gateway that has been deferred since
the beginning of the project.

### 3.1 Routing table — and two collisions that matter

Path prefixes are mostly already namespaced per service, but **two prefixes are shared by two services
each**, and a naive `/api/x → service` mapping will break them:

| Path | Goes to | Note |
|---|---|---|
| `/api/places/*/summary` | **topics** | must be matched **before** the next row |
| `/api/places` | places | |
| `/api/identity/*`, `/api/auth/*` | identity | |
| `/api/feedback/*` | feedback | |
| `/api/admin/comments*` | **feedback** | must be matched **before** the next row |
| `/api/admin/*` | topics | overview, topics, dimensions, pipeline, audit |
| `/api/connections/*` | connections | |
| `/api/topics/*`, `/api/dimensions`, `/api/sentiment/*`, `/api/itinerary/*` | topics | |
| everything else | static frontend | SPA fallback to `index.html` |

Caddy matches in the order written, so the two specific rules go above their general counterparts. Getting
this wrong is subtle: place summaries and admin comment moderation would 404 while everything else worked.

## 4. Domain, TLS and reachability

1. **Get a name.** A cheap `.site`/`.xyz` registration, or a free dynamic-DNS hostname (DuckDNS, No-IP).
   A real domain is better: Let's Encrypt works with both, but a registrar domain survives the DDNS
   provider going away.
2. **Forward ports 80 and 443** on the router to `192.168.1.100`. Port 80 is required for the ACME HTTP
   challenge; without it, certificates need the DNS challenge instead.
3. **Pin the LAN address.** A DHCP reservation for this laptop's MAC on the router, so the forward doesn't
   silently point at nothing after a lease change — which is exactly the failure that broke the phone.
4. **Handle the dynamic public IP** with a DDNS updater (a scheduled task calling the provider's update
   URL, or the router's built-in client).
5. **Caddy obtains and renews certificates automatically** — this is the main reason to prefer it over
   nginx here. A `Caddyfile` of roughly twenty lines covers §3.1 plus TLS.
6. **If the ISP blocks inbound 80/443** — worth testing early, some do — the fallback is a tunnel
   (Cloudflare Tunnel is free and needs no open ports). That is an external dependency, so it is a decision
   to make consciously rather than a default.

## 5. Configuration changes required

| Change | Files |
|---|---|
| Production Dockerfile, static output | `frontend/Dockerfile` |
| Drop the five `VITE_*` origins, use relative paths | `frontend/.env`, `frontend/src/api/*.ts` |
| Make CORS configurable, then rely on same-origin | 4 × `Program.cs`, `topics-service/main.py` |
| New JWT secret, injected from env | `infra/.env`, compose env for 4 services |
| Public base URLs and Google redirect | compose env: `Identity__PublicBaseUrl`, `Identity__FrontendBaseUrl`, `Google__RedirectUri` |
| `ASPNETCORE_ENVIRONMENT: Production` + every setting supplied as env | `infra/docker-compose.yml` |
| Stop publishing `5432` and the five API ports | `infra/docker-compose.yml` |
| Add the Caddy service, `Caddyfile`, cert volume | `infra/` |
| Single source for `ADMIN_USER_IDS` | compose env |

A separate `infra/docker-compose.prod.yml` overlay is the cleanest shape: it keeps the dev workflow intact
and expresses production as a diff, exactly as the GPU override already does.

## 6. The mobile app

### 6.1 Android — achievable on this laptop

Nothing here needs a cloud builder, but the toolchain has to be installed (~10 GB):

1. **JDK 17** and the **Android SDK command-line tools** (Android Studio is the easy path; `sdkmanager` is
   the minimal one). Set `JAVA_HOME` and `ANDROID_HOME`.
2. `npx expo prebuild --platform android` to generate the native project.
3. Create an upload keystore (`keytool -genkeypair`) and keep it out of git — losing it means a new app
   identity later.
4. `cd android && ./gradlew assembleRelease` (or `eas build --platform android --local`, which runs
   entirely on this machine).
5. Distribute the resulting APK by direct download from the deployed site, and sideload it.

**Build-time configuration matters.** A release build has no Metro server, so the `hostUri` fallback in
`src/config.ts` never fires. `EXPO_PUBLIC_API_HOST` must be set to the public hostname *when the bundle is
built*, and the base URLs must become HTTPS. Simplest: set `EXPO_PUBLIC_API_HOST=resonance.example.com` and
change `serviceUrl()` to emit `https://host` with no port, since everything is now behind one origin.

### 6.2 iOS — not achievable here

A signed `.ipa` requires macOS (Xcode) plus a paid Apple Developer account. Neither exists, and no local
workaround changes that. The realistic options are: ship Android only, or keep iOS on Expo Go pointed at
the deployed backend — which works, but is a development tool, not distribution.

### 6.3 Google sign-in and push after deployment

Google sign-in needs no code change once the domain exists — the `returnTo` allow-list for `resonance://`
and `exp://` is already implemented. Only the Google Cloud console entry and the three config values
change.

Push notifications still require a real build (done, per §6.1) and an EAS project id from `npx eas init`,
plus Expo's relay to actually deliver. If "no external services" is strict, push has to be dropped — which
would remove the main justification for the app being native at all (see `mobile-app-design.md` §0). Worth
deciding deliberately.

## 7. Operating it

- **Never sleep**: `powercfg /change standby-timeout-ac 0`, and set lid-close to "do nothing" on AC.
- **Start on boot**: enable Docker Desktop's "Start when you log in", set Windows to auto-login, and keep
  `restart: unless-stopped` (already set on every service).
- **Firewall**: explicit inbound allow rules for TCP 80 and 443 on the Public profile. Nothing else should
  be reachable — no 5432, no 5076, no 5173.
- **Migrations on deploy**: run the four `dotnet ef database update` commands, or add a one-shot migration
  container that runs before the APIs.
- **Backups**: a scheduled `docker exec resonance-postgres pg_dumpall` into a folder that is *not* the
  Docker volume, plus an occasional copy to external storage. Untested backups do not count.
- **Compose invocation is part of the procedure**, because of §2.12:
  `docker compose -f infra/docker-compose.yml -f infra/docker-compose.gpu.yml -f infra/docker-compose.prod.yml up -d`

## 8. First deploy — order of work

1. Domain registered, DNS A record pointing at the public IP, DDNS updater running.
2. Router: DHCP reservation for the laptop, ports 80/443 forwarded. Verify from outside the LAN (phone on
   mobile data) before going further — if the ISP blocks inbound, stop and reconsider §4.6.
3. Frontend production Dockerfile; confirm `dist/` builds and serves.
4. Caddy service + `Caddyfile` with the §3.1 routing, including both ordering-sensitive rules.
5. Switch the frontend to relative API paths; delete the `VITE_*` origins.
6. `docker-compose.prod.yml`: new JWT secret, production URLs, `ASPNETCORE_ENVIRONMENT=Production`, ports
   unpublished except the proxy.
7. Bring it up on HTTP first, confirm certificates issue, then verify HTTPS end to end.
8. Update Google Cloud with the new redirect URI; test web sign-in.
9. Run migrations; smoke-test register → login → map → comment → message.
10. Install the Android toolchain; build a signed APK against the public hostname; test on a phone using
    **mobile data**, not Wi-Fi, to prove it works off the LAN.
11. Set up backups and the never-sleep power settings.

## 9. Honest limitations

- **One laptop is the whole system.** Reboot, Windows Update, a closed lid or a power cut is downtime.
- **Home ISP**, dynamic IP, asymmetric upload, no SLA.
- **Exposing a personal machine to the internet** means real scanning traffic within hours. There is no
  rate limiting, no WAF and no intrusion monitoring in this project; admin endpoints are protected only by
  a user-id allow-list, and comments are public and unmoderated by design.
- **No staging environment** — production is the only place changes get tested.
- The 23 GB topics image makes rebuilds slow and disk pressure real.

None of these are blockers for a diploma demonstration. They would be blockers for real users, and saying
so plainly is more useful than pretending otherwise.

## 10. Open decisions

1. **Domain**: registered name or free DDNS hostname?
2. **If the ISP blocks inbound 80/443** — accept a tunnel (external service) or keep the app LAN-only?
3. **Push notifications**: keep them, accepting Expo's relay, or drop them?
4. **iOS**: Android-only distribution, or iOS via Expo Go against the deployed backend?
5. **MediatR licence**: buy, downgrade to 12.x, or remove?
6. **Postgres**: stay containerised, or install natively on Windows for easier backups?
