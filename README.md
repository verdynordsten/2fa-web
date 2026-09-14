# 2FA Live — Instant TOTP Codes Online

Free browser-based TOTP authenticator. Paste a secret or scan a QR code, get a fresh 6-digit live code every 30 seconds. No signup, no server, no database — everything runs locally in the tab.

## Local development

```bash
# Edit source in src/, then rebuild
bash build.sh

# Serve the minified output
python3 -m http.server 8812 --directory dist
```

## Deploy (Dokploy)

Dokploy builds the `Dockerfile` on every push to the deploy branch:

1. Builder stage minifies `src/` into `dist/` via `build.sh`.
2. Nginx stage serves `dist/` statically with gzip + caching.

No environment variables needed. No database. Static only.

## Project layout

```
src/          # Source of truth — edit here
dist/         # Minified output (gitignored, built on deploy)
build.sh      # Minify pipeline
Dockerfile    # Multi-stage: node builder + nginx serve
nginx.conf    # Static serving, gzip, cache policy
```

## Privacy

Secrets are computed locally with standard TOTP (RFC 6238). Pinned feeds stay in the visitor's own browser storage. Nothing is uploaded anywhere.
