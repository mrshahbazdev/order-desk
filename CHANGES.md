# What changed in this build

All wiring is already applied — unzip, `npm install`, `npm run dev`.

## Fixed
- `electron/print/render.cjs` — direct printing never completed (`finally`
  destroyed the window before the print callback fired); batch printing broke
  on `data:` URLs; deprecated `marginsType`; thermal page sizes ignored.
- `electron/security/vault.cjs` — removed the plaintext fallback that wrote
  store tokens to disk in cleartext. Atomic writes, explicit failure.
- `electron/security/license.cjs` — the public key was a placeholder, so no
  key could ever activate. Real verification + enforceable tier gates.
- `electron/main.cjs` — cold-start deep links were dropped (first OAuth
  connect failed for every new customer); added CSP, `sandbox: true`,
  navigation lockdown, window-state persistence, diagnostics, data deletion.
- `electron/preload.cjs` — removed the `window.electron` bridge that exposed
  every IPC channel with no allowlist.
- `electron/ipc/stores.cjs` — store count now gated by license tier.
- `electron/ipc/print.cjs` — batch size now gated by license tier.

## Added
- `src/pages/PackStation.jsx` + `electron/ipc/pack.cjs` +
  `electron/db/repos/pack.cjs` + `002_pack_station.sql` — scan-verified packing.
- `src/components/ToastProvider.jsx` — app-wide feedback and a sync progress
  bar. Consumes the `notification` / `sync:progress` channels that were
  allowlisted but never listened to.
- `src/components/ErrorBoundary.jsx` — per-screen recovery with copyable
  diagnostics.
- `scripts/license-keygen.mjs` — generate keypair, sign licenses, verify.

## package.json
- Added the `appx` target and `appx` identity block (fill in from Partner
  Center → Product identity).
- Dropped `express`, `ws`, `nodemailer` — unused, and a local server would
  force `privateNetworkClientServer` in the MSIX manifest.

## Do this first
```bash
npm install
npm run license:keygen        # paste public key into electron/security/license.cjs
echo "license-private.pem" >> .gitignore
npm run dev
```

Read REVIEW.md for the full findings and the remaining UI/UX list.
