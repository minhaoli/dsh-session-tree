#!/usr/bin/env node
/**
 * Regenerate lib/host.js from a dsh-session-manager checkout.
 *
 * The tree ships the session-manager host half inside its own package so that
 * `dsh plugin add github:minhaoli/dsh-session-tree` is self-contained: no file
 * outside the package, no assumption about a profile's plugins/ directory.
 * This script is the only supported way to change that copy.
 *
 * Usage:
 *   node scripts/sync-host.mjs [path-to-dsh-session-manager]
 *
 * The path defaults to a sibling checkout named dsh-session-manager. The script
 * reads <checkout>/lib/index.js, normalizes line endings, refuses a file that
 * does not export `apply`, and writes lib/host.js with a provenance header.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkout = path.resolve(process.argv[2] ?? path.join(pkgRoot, '..', 'dsh-session-manager'));
const source = path.join(checkout, 'lib', 'index.js');
const target = path.join(pkgRoot, 'lib', 'host.js');

if (!fs.existsSync(source)) {
  console.error(`not found: ${source}`);
  console.error('pass the path to a dsh-session-manager checkout as the first argument');
  process.exit(1);
}

const body = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
if (!/export default apply;?/.test(body)) {
  console.error(`refusing to vendor ${source}: it does not export a default apply`);
  process.exit(1);
}

let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', checkout, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // A checkout without git metadata still vendors; the header says so.
}

const digest = crypto.createHash('sha256').update(body).digest('hex');
const header = `/**
 * Vendored host half of dsh-session-manager. Do not edit by hand.
 *
 * Source:       https://github.com/minhaoli/dsh-session-manager (lib/index.js)
 * Commit:       ${commit}
 * Source digest: sha256:${digest}
 * Synced:       ${new Date().toLocaleDateString('sv-SE')}
 *
 * Regenerate with:
 *   node scripts/sync-host.mjs <path-to-dsh-session-manager-checkout>
 *
 * The copy lives here so the package installs without a file outside it. The
 * two must not both be mounted: this copy already registers the agent tools and
 * the /api/dsh-session-manager/ routes.
 */
`;

fs.writeFileSync(target, header + body, 'utf8');
const out = fs.readFileSync(target);
console.log(`wrote ${path.relative(pkgRoot, target)}: ${out.length} bytes`);
console.log(`source commit: ${commit}`);
console.log(`source digest: sha256:${digest}`);
