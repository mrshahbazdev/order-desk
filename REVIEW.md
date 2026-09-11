# Order Desk — code review + what changed

Reviewed all 8,400 lines. The architecture is sound and the layering is
clean — SQL stays in repos, the renderer never sees a token, the schema
uses minor units. What follows is what's actually broken, then what's
missing.

---

## Part 1 — Bugs that stop the app working

### 1. Silent printing never completes  `print/render.cjs`

```js
try {
  return new Promise((resolve, reject) => {
    win.webContents.print(opts, cb);   // async, resolves later
  });
} finally {
  win.close();                          // runs NOW, not later
}
```

In an async function, `finally` runs the instant the `return` statement
executes — not when the returned promise settles. The window was destroyed
mid-print, so every silent print failed or produced a blank page. Direct
printing is the core feature of this product, so this was the most
expensive bug in the codebase.

**Fixed:** the print is awaited inside the try block.

### 2. Batch printing breaks on real batches  `print/render.cjs`

```js
await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
```

Two problems. `data:` URLs hit a length ceiling, and 80 packing slips of
HTML blows straight past it — the exact scenario the feature exists for.
And a `data:` URL creates an opaque origin, so every remote product image
in a packing slip silently fails to load.

**Fixed:** HTML is written to a temp file and loaded with `loadFile()`,
with the temp file cleaned up afterwards. Also added a wait for fonts and
images to settle before capture, otherwise barcodes come out blank on
faster machines.

### 3. Deprecated print options  `print/render.cjs`

`marginsType: 0` was removed in Electron 30 — it's `margins: { marginType }`
now, and it was being ignored, which is why thermal output had unexpected
white borders. Page size for thermal was hardcoded to 4×6" even when the
caller asked for 100×150mm.

**Fixed:** a `PAGE_PRESETS` map per document kind, plus
`preferCSSPageSize: true` so the template's own `@page` rule wins.

### 4. Vault falls back to plaintext  `security/vault.cjs`

```js
} else {
  fs.writeFileSync(filePath, Buffer.from(serialized, 'utf8'));  // cleartext
}
```

If `safeStorage` was unavailable, Shopify access tokens and WooCommerce
consumer secrets were written to disk in plain JSON. Worse, the read path
would happily parse it back, so once triggered it stayed plaintext forever.
That's a full store-takeover credential sitting in any backup.

**Fixed:** the fallback is gone. If the OS can't encrypt, the app refuses
to save and says why. Also added atomic writes (`.tmp` + rename) so a crash
mid-write can't truncate the vault, and a clear error when the vault can't
be decrypted instead of silently starting fresh, which looks to the user
like all their stores vanished.

### 5. No license can ever be activated  `security/license.cjs`

The baked-in public key is a placeholder — plausible-looking base64 that
isn't a real Ed25519 key. `crypto.verify()` throws on it, the catch returns
`{ valid: false }`, so every key on earth is rejected. Nobody could have
paid you.

**Fixed:** proper `createPublicKey()` handling with a loud console error
when the placeholder is still in place, plus `scripts/license-keygen.mjs`
to generate a real keypair, sign licenses, and verify them.

Run this before anything else:

```bash
node scripts/license-keygen.mjs keygen
# paste the public key into electron/security/license.cjs
echo "license-private.pem" >> .gitignore
```

### 6. Licensing is computed but never enforced

`getCurrentLicense()` returns `maxStores`, `batchPrintLimit` and
`maxHistoryDays`, and nothing in the codebase reads them. Every install
behaves as Business tier. The free tier is decorative.

**Fixed:** added `assertCanAddStore()`, `assertBatchSize()` and
`getHistoryCutoff()`. You still need to call them — see wiring below.

### 7. First OAuth connect is dropped  `main.cjs`

Deep links were only handled in `second-instance`. On Windows, if the app
isn't already running, the URL arrives in `process.argv` of the *first*
instance and `second-instance` never fires. So the connect flow worked in
testing (app already open) and failed for every new customer.

**Fixed:** `process.argv` is parsed at startup and replayed on
`ready-to-show`. Also added the macOS `open-url` handler.

### 8. No Content-Security-Policy  `main.cjs`

Order data — customer names, order notes, product titles — comes from
third-party stores and lands in the DOM. With no CSP, a crafted order note
is a script execution primitive in a context that has IPC access.

**Fixed:** CSP header applied via `onHeadersReceived`, permission requests
denied by default, `will-navigate` locked down, and `sandbox: true` (the
preload only touches `electron`, so the `sandbox: false` comment was wrong).

---

## Part 2 — What I added

### Pack Station — the feature that sells this product

`src/pages/PackStation.jsx`, `electron/ipc/pack.cjs`,
`electron/db/repos/pack.cjs`, `electron/db/migrations/002_pack_station.sql`

Scan an order barcode, scan each item, the app verifies against the line
items, then prints the slip and label and queues the fulfilment. Wrong item
gets a harsh buzz and a red banner.

Why this and not something else: everything else in the app is a nicer view
of data the merchant can already see in their admin. This does something
their admin cannot — it stops them shipping the wrong thing. Mis-ships cost
real money, and a tool that prevents them justifies a price without an
argument. It's also the reason to buy a *desktop* app rather than use a web
dashboard, since a scanner is a keyboard and the browser is a bad host for
one.

Design decisions worth knowing:

- The input steals focus back every 800ms and on every click. Lose focus at
  a packing table and scans go into the void.
- Audio feedback is synthesised with `AudioContext` — no files to ship or
  fail to load. Different tone per outcome, since the operator is looking
  at the box, not the screen.
- Sessions survive a crash. Reopening resumes the same open session rather
  than making someone rescan a 14-item order.
- Every scan is recorded including mis-scans. `getProblemScans()` surfaces
  repeat offenders, which almost always means a mislabelled SKU — a genuine
  insight the merchant can act on.
- Printing happens *before* fulfilment is queued. If the printer jams you
  want the order still unfulfilled, not fulfilled with no label.

### Diagnostics and data deletion  `main.cjs`

`app:getDiagnostics` returns versions, platform, store statuses and recent
errors — deliberately excluding domains and tokens, since users paste this
into public support threads. `app:deleteAllData` wipes DB, vault and
documents with a confirmation. Both are Store-certification-adjacent and
both cut support load.

---

## Part 3 — Wiring (needed for the new files)

**1. Register the pack repo** — `electron/db/index.cjs`

```js
const PackRepo = require('./repos/pack.cjs');
// inside init(), next to the other repos:
this.pack = new PackRepo(this.db);
```

**2. Register the IPC** — `electron/main.cjs`, in `initApp()`

```js
const { registerPackIPC } = require('./ipc/pack.cjs');
registerPackIPC(dbManager, syncEngine);
```

**3. Expose it** — `electron/preload.cjs`, inside `api`

```js
pack: {
  lookup:   (code) => ipcRenderer.invoke('pack:lookup', code),
  scan:     (data) => ipcRenderer.invoke('pack:scan', data),
  finish:   (data) => ipcRenderer.invoke('pack:finish', data),
  abandon:  (id)   => ipcRenderer.invoke('pack:abandon', id),
  next:     ()     => ipcRenderer.invoke('pack:next'),
  stats:    (o)    => ipcRenderer.invoke('pack:stats', o),
  problems: (o)    => ipcRenderer.invoke('pack:problems', o)
},
app: {
  getDiagnostics: () => ipcRenderer.invoke('app:getDiagnostics'),
  openUserData:   () => ipcRenderer.invoke('app:openUserData'),
  deleteAllData:  () => ipcRenderer.invoke('app:deleteAllData')
},
```

**4. Add the nav entry** — `src/App.jsx`

```js
import PackStation from './pages/PackStation';
// NAV_ITEMS, directly under Orders:
{ id: 'pack', label: 'Pack Station', icon: <ScanIcon /> },
// renderContent():
case 'pack': return <PackStation />;
```

**5. Enforce the license** — `electron/ipc/stores.cjs` and `print.cjs`

```js
// stores:create, before inserting
licenseManager.assertCanAddStore();

// print:generatePDF / directPrint, when data.orders is an array
licenseManager.assertBatchSize(data.orders.length);
```

Also drop the backward-compatibility bridge in `preload.cjs`:

```js
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});
```

That exposes *every* IPC channel to the renderer with no allowlist, which
undoes the point of having a typed API surface. Nothing in `src/` uses it.

---

## Part 4 — UI/UX gaps, in the order I'd fix them

**1. No feedback after actions.** Sync, fulfil, print and stock updates all
complete with no confirmation. The `notification` channel exists in the
preload allowlist and is never sent. Add a toast provider and emit from the
main process. This is the single biggest perceived-quality gap.

**2. No empty or first-run state.** A fresh install shows a dashboard of
zeros and eight nav items. There's no path to "connect your first store".
First-run is where you lose people.

**3. No error boundary.** One render error anywhere blanks the entire
window with no way back except restarting.

**4. No global search or command palette.** For a keyboard-driven ops tool,
`Ctrl+K` to jump to an order by number is table stakes.

**5. Orders page filters don't survive navigation.** Filter state resets
every time you leave the page — brutal when working a queue. Lift it into a
context or persist to settings.

**6. Search fires on every keystroke.** `Orders.jsx` re-queries with no
debounce. Add 250ms. Also `search` isn't in the `useEffect` dependency
array at line 115, so search may not trigger a refetch at all — worth
checking.

**7. No sync progress in the shell.** `sync:progress` is broadcast and only
`SyncHealth` listens. During a 20,000-order backfill the rest of the app
looks frozen. Put a thin progress bar under the AppBar.

**8. Dark sidebar, light everything else, no dark mode.** The palette is
already built around slate tokens — wiring a real dark mode is an hour and
warehouse screens are often in dim rooms.

**9. Money formatting.** Confirm `formatters.js` divides by 100 everywhere.
Mixing minor and major units is the classic bug in this schema, and it will
show up on a printed invoice in front of a customer.

**10. Free-tier upgrade path.** Once gates are enforced, a blocked action
must explain the limit and link to purchase. A bare error is a lost sale.

---

## Part 5 — Before you ship

- Remove `express`, `ws` and `nodemailer` from dependencies unless actually
  used. They inflate the bundle, and `privateNetworkClientServer` in an MSIX
  manifest invites certification questions you don't want to answer.
- Add the `appx` target and Partner Center identity values.
- Gate `electron-updater` on `process.windowsStore` — it does not work in
  MSIX and will throw on launch.
- Test that `better-sqlite3` loads from the packaged appx before submitting.
  A native module load failure on first launch is an instant rejection.
- Pin the Shopify API version in one constant (already done — `2026-01`)
  and set a calendar reminder for the next version bump.
