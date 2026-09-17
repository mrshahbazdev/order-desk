# Resubmission — v1.0.1

Certification failed on one item only: **10.1.1.11 On Device Tiles**. The
package still carried Electron's default tile image. Everything else passed,
including the demo-mode walkthrough, privacy policy and metadata.

## What changed in this build

- `build/appx/` — six tile images replacing the Electron default
  (44, 71, 150, 310 square, 50 store, 310x150 wide)
- `build/icon.ico` and `build/icon-256.png` — same mark
- `package.json` version `1.0.0` -> `1.0.1`
  (Partner Center rejects a resubmission carrying the same version)
- `win.target` reduced to `appx` only. NSIS output needs a code-signing
  certificate to avoid the SmartScreen "Unknown publisher" warning, and that is
  a separate decision — building it now only produces an artifact you cannot
  ship.
- `license-private.pem` and `license-public.pem` removed from the project
  folder. They were back in the uploaded zip. `.gitignore` already covers
  `*.pem`, but a file that is already tracked stays tracked, so check with:

      git log --all --oneline -- license-private.pem

  If that prints anything, the key is in history and needs rotating. Keep the
  keypair outside the project folder — ideally on whatever signs licenses.

## Build and resubmit

```bash
npm install
npm run dist:win
```

1. Partner Center -> Skulane -> Packages
2. **Remove** the old packages
3. Upload `release/Skulane 1.0.2.appx`
4. Store listing -> Store logos: upload `build/store/AppTile300.png`
   (300x300 App tile icon) and `build/store/BoxArt1080.png` (1080x1080 Box art)
5. Submit for certification

Leave Pricing, Properties, Age ratings and Submission options alone — all
already approved, and editing them invites a re-review of things that passed.

## Still open, for 1.0.2

- Courier `api_key` and `account_number` are stored as plaintext in the
  `couriers` table and `SELECT *` sends them to the renderer. The published
  privacy policy states plaintext credentials are never saved in database
  tables, so this is currently a false claim on a public page. Move them into
  the vault behind a `credential_id`, the same way store credentials work.
- Privacy policy says "encrypted SQLite database". The database is not
  encrypted — only the vault is. Reword it.
- `mrshahbaz46@gamil.com` is a typo in both privacy.html and README.md.
- A personal phone number is published on the policy page. It will be scraped.
