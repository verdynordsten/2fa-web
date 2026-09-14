# AGENTS.md — scripts/2fa-web

## Project Overview
Static 2FA TOTP web app (clone of 2fa.co.com, restyled). No backend, no database, no build step. Pure HTML/CSS/JS served as static files.

## Structure
```
scripts/2fa-web/
├── src/           # Source of truth — edit here
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── dist/          # Minified output — served to visitors
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── build.sh       # Minify: terser + cleancss + html-minifier-terser
├── AGENTS.md      # This file
└── CLAUDE.md      # Agent context
```

## Conventions
- All code/comments/docs English only.
- No secrets committed. localStorage only in browser.
- CDN deps: otpauth@9 (unpkg), jsQR (jsdelivr). No npm install needed.

## Verification
- `bash build.sh` — rebuild dist/ from src/
- `node --check dist/app.js`
- Serve: `python3 -m http.server 8812 --directory /opt/data/scripts/2fa-web/dist`
- Tunnel: `cloudflared tunnel --url http://localhost:8812`

## Notes
- TOTP = HMAC-SHA1(secret, time-counter), 30s period, 6 digits.
- QR scan via getUserMedia + jsQR; upload decode via canvas + jsQR.
- otpauth:// URIs parsed for secret + label + issuer.
