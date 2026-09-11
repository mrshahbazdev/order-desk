#!/usr/bin/env node
/**
 * Order Desk licensing utility.
 *
 *   node scripts/license-keygen.mjs keygen
 *       Generates an Ed25519 keypair. Paste the PUBLIC key into
 *       electron/security/license.cjs. Keep the PRIVATE key on the machine
 *       that signs licenses (your VPS / Worker), never in the repo.
 *
 *   node scripts/license-keygen.mjs sign --key private.pem \
 *        --email a@b.com --tier pro --months 12
 *       Prints a license key to hand to the customer.
 *
 *   node scripts/license-keygen.mjs verify --pub public.pem --license "<key>"
 */

import crypto from 'node:crypto';
import fs from 'node:fs';

const args = process.argv.slice(2);
const cmd = args[0];

const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

function keygen() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const pub = publicKey.export({ type: 'spki', format: 'pem' });
  const priv = privateKey.export({ type: 'pkcs8', format: 'pem' });

  fs.writeFileSync('license-private.pem', priv, { mode: 0o600 });
  fs.writeFileSync('license-public.pem', pub);

  console.log('\n--- PUBLIC KEY: paste into electron/security/license.cjs ---\n');
  console.log(pub);
  console.log('--- PRIVATE KEY written to license-private.pem ---');
  console.log('Add license-private.pem to .gitignore right now. If it leaks,');
  console.log('anyone can mint licenses and every shipped build trusts them.\n');
}

function sign() {
  const keyPath = flag('key', 'license-private.pem');
  const email = flag('email');
  const tier = flag('tier', 'pro');
  const months = parseInt(flag('months', '12'), 10);
  const seats = parseInt(flag('seats', '1'), 10);

  if (!email) {
    console.error('--email is required');
    process.exit(1);
  }
  if (!['pro', 'business'].includes(tier)) {
    console.error('--tier must be pro or business');
    process.exit(1);
  }

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + months);

  const payload = {
    email,
    tier,
    seats,
    issued_at: now.toISOString(),
    expires_at: expires.toISOString(),   // update window, not a kill switch
    id: 'lic_' + crypto.randomBytes(8).toString('hex')
  };

  const payloadJson = JSON.stringify(payload);
  const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath));
  const signature = crypto.sign(null, Buffer.from(payloadJson, 'utf8'), privateKey);

  const licenseKey =
    Buffer.from(payloadJson).toString('base64url') + '.' +
    signature.toString('base64url');

  console.log('\nLicense for', email, `(${tier}, ${months} months of updates)\n`);
  console.log(licenseKey);
  console.log('\nRecord', payload.id, 'against the order in your billing system.\n');
}

function verify() {
  const pubPath = flag('pub', 'license-public.pem');
  const license = flag('license');
  if (!license) {
    console.error('--license is required');
    process.exit(1);
  }

  const [payloadB64, sigB64] = license.trim().split('.');
  const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const publicKey = crypto.createPublicKey(fs.readFileSync(pubPath));

  const ok = crypto.verify(
    null,
    Buffer.from(payloadJson, 'utf8'),
    publicKey,
    Buffer.from(sigB64, 'base64url')
  );

  console.log(ok ? 'VALID' : 'INVALID');
  if (ok) console.log(JSON.parse(payloadJson));
}

if (cmd === 'keygen') keygen();
else if (cmd === 'sign') sign();
else if (cmd === 'verify') verify();
else {
  console.log('Usage: license-keygen.mjs <keygen|sign|verify> [options]');
  process.exit(1);
}
