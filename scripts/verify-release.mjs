import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, createPublicKey, verify } from 'node:crypto';
export const CONTRACT = JSON.parse(readFileSync(new URL('../release-contract.json', import.meta.url), 'utf8'));
const metadataScript = fileURLToPath(new URL('./release-metadata.py', import.meta.url));
function metadata(kind, value) {
  try {
    return JSON.parse(execFileSync(process.platform === 'darwin' ? '/usr/bin/python3' : 'python3', [metadataScript, kind, ...(kind === 'archive' ? [value] : [])], { input: kind === 'appcast' ? value : undefined, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 128 * 1024 }));
  } catch { throw Error('Invalid XML or application archive metadata (Python 3 required)'); }
}
/** Validate only local artifacts. The key must come from a separately trusted source. */
export function verifyRelease(tag, directory, publicKey) {
  if (!new RegExp(CONTRACT.tagPattern).test(tag)) throw Error('Stable vX.Y.Z tag required');
  const path = join(directory, CONTRACT.archive), archive = readFileSync(path);
  const checksum = readFileSync(join(directory, CONTRACT.checksum), 'utf8');
  if (checksum !== `${createHash('sha256').update(archive).digest('hex')}  ${CONTRACT.archive}\n`) throw Error('Checksum mismatch');
  const app = metadata('archive', path);
  if (app.id !== CONTRACT.bundleIdentifier || app.version !== tag.slice(1)) throw Error('Archived app identity/version does not match release tag');
  if (!app.arm64 || app.minimum !== CONTRACT.minimumSystemVersion) throw Error('Archived app platform does not match release contract');
  if (!existsSync(join(directory, CONTRACT.appcast))) {
    if (publicKey) throw Error('Authenticated release requires an appcast');
    return { tag, bytes: archive.length, archive: CONTRACT.archive, authenticated: false };
  }
  if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey)) throw Error('Trusted Ed25519 public key required');
  if (app.build !== tag.slice(1) || app.publicKey !== publicKey || app.feedURL !== CONTRACT.feedURL) throw Error('Archived updater configuration does not match release');
  const xml = readFileSync(join(directory, CONTRACT.appcast), 'utf8');
  if (Buffer.byteLength(xml) > 64000) throw Error('Unsupported appcast size');
  const item = metadata('appcast', xml);
  if (item.version !== tag.slice(1) || item.shortVersion !== tag.slice(1)) throw Error('Tag/version mismatch');
  if (item.minimum !== CONTRACT.minimumSystemVersion) throw Error('Unsupported system version');
  if (item.url !== `https://github.com/${CONTRACT.repository}/releases/download/${tag}/${CONTRACT.archive}`) throw Error('Unexpected archive URL');
  if (item.length !== String(archive.length)) throw Error('Length mismatch');
  if (item.os !== 'macos' || item.type !== 'application/octet-stream') throw Error('Unsupported archive platform/type');
  if (!/^[A-Za-z0-9+/]{86}==$/.test(item.signature ?? '')) throw Error('Invalid signature encoding');
  const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKey, 'base64')]), format: 'der', type: 'spki' });
  if (!verify(null, archive, key, Buffer.from(item.signature, 'base64'))) throw Error('Invalid update signature');
  return { tag, bytes: archive.length, archive: CONTRACT.archive, authenticated: true };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tag, directory, publicKey] = process.argv.slice(2);
  console.log(JSON.stringify(verifyRelease(tag, directory, publicKey)));
}
