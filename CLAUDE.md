# CLAUDE.md — scripts/2fa-web

Static 2FA TOTP generator web app. Dark restyled clone of 2fa.co.com.

## Stack
- Static HTML + CSS + vanilla JS. Zero backend, zero database.
- CDN: `otpauth@9` (TOTP), `jsQR` (QR decode). No build step.

## Files
- `index.html` — markup: hero, generator card, account list, FAQ.
- `styles.css` — dark gradient + glassmorphism, mobile-first responsive.
- `app.js` — state, TOTP loop, clipboard, camera QR, file QR, localStorage store, export/import.

## Key Logic
- `parseInput(raw)`: accepts raw base32 secret or `otpauth://totp/...?secret=...&issuer=...`.
- `refreshLoop`: setInterval 500ms, computes TOTP via OTPAuth, updates code + SVG countdown ring.
- Store shape in localStorage key `totp2fa.accounts.v1`: `[{id, label, secret}]`.
- Never log secrets. All computation client-side.

## Test
- `node --check app.js`
- Open in browser, enter test secret `JBSWY3DPEHPK3PXP`, expect 6-digit code changing every 30s.
