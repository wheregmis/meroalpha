import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createPublicKey, verify } from 'node:crypto';
export const CONTRACT = JSON.parse(readFileSync(new URL('../release-contract.json', import.meta.url), 'utf8'));
/** Validate only local artifacts. The key must come from a separately trusted source. */
export function verifyRelease(tag, directory, publicKey) {
  if (!new RegExp(CONTRACT.tagPattern).test(tag)) throw Error('Stable vX.Y.Z tag required');
  const archive = readFileSync(join(directory, CONTRACT.archive));
  const checksum = readFileSync(join(directory, CONTRACT.checksum), 'utf8');
  if (checksum !== `${createHash('sha256').update(archive).digest('hex')}  ${CONTRACT.archive}\n`) throw Error('Checksum mismatch');
  if (!existsSync(join(directory, CONTRACT.appcast))) {
    if (publicKey) throw Error('Authenticated release requires an appcast');
    return { tag, bytes: archive.length, archive: CONTRACT.archive, authenticated: false };
  }
  if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey)) throw Error('Trusted Ed25519 public key required');
  const xml = readFileSync(join(directory, CONTRACT.appcast), 'utf8');
  if (xml.length > 64000 || /<!DOCTYPE|<!ENTITY|sparkle:channel|sparkle:installationType/i.test(xml)) throw Error('Unsupported appcast');
  const one = (pattern) => {
    const matches = [...xml.matchAll(pattern)];
    if (matches.length !== 1) throw Error('Expected one stable update');
    return matches[0][1];
  };
  if ((xml.match(/<item>/g) ?? []).length !== 1 || (xml.match(/<enclosure\b/g) ?? []).length !== 1) throw Error('Expected one update enclosure');
  for (const field of ['version', 'shortVersionString']) if (one(new RegExp(`<sparkle:${field}>([^<]+)</sparkle:${field}>`, 'g')) !== tag.slice(1)) throw Error('Tag/version mismatch');
  if (one(/<sparkle:minimumSystemVersion>([^<]+)<\/sparkle:minimumSystemVersion>/g) !== CONTRACT.minimumSystemVersion) throw Error('Unsupported system version');
  if (one(/\burl="([^"]+)"/g) !== `https://github.com/${CONTRACT.repository}/releases/download/${tag}/${CONTRACT.archive}`) throw Error('Unexpected archive URL');
  if (one(/\blength="([^"]+)"/g) !== String(archive.length)) throw Error('Length mismatch');
  if (one(/sparkle:os="([^"]+)"/g) !== 'macos') throw Error('Unsupported platform');
  const signature = one(/sparkle:edSignature="([^"]+)"/g);
  if (!/^[A-Za-z0-9+/]{86}==$/.test(signature)) throw Error('Invalid signature encoding');
  const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKey, 'base64')]), format: 'der', type: 'spki' });
  if (!verify(null, archive, key, Buffer.from(signature, 'base64'))) throw Error('Invalid update signature');
  return { tag, bytes: archive.length, archive: CONTRACT.archive, authenticated: true };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tag, directory, publicKey] = process.argv.slice(2);
  console.log(JSON.stringify(verifyRelease(tag, directory, publicKey)));
}
