import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONTRACT, verifyRelease } from '../scripts/verify-release.mjs';
test('release contract authenticates bytes and rejects mismatched metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'meroalpha-contract-'));
  try {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const key = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
    const bytes = Buffer.from('synthetic archive fixture');
    const sig = sign(null, bytes, privateKey).toString('base64');
    const xml = `<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel><item><sparkle:version>0.3.0</sparkle:version><sparkle:shortVersionString>0.3.0</sparkle:shortVersionString><sparkle:minimumSystemVersion>14.0</sparkle:minimumSystemVersion><enclosure url="https://github.com/wheregmis/meroalpha/releases/download/v0.3.0/${CONTRACT.archive}" length="${bytes.length}" sparkle:edSignature="${sig}" sparkle:os="macos" /></item></channel></rss>`;
    writeFileSync(join(directory, CONTRACT.archive), bytes);
    writeFileSync(join(directory, CONTRACT.checksum), `${createHash('sha256').update(bytes).digest('hex')}  ${CONTRACT.archive}\n`);
    assert.equal(verifyRelease('v0.3.0', directory).authenticated, false);
    assert.throws(() => verifyRelease('v0.3.0', directory, key), /requires an appcast/);
    writeFileSync(join(directory, CONTRACT.appcast), xml);
    assert.throws(() => verifyRelease('v0.3.0', directory), /Trusted/);
    assert.equal(verifyRelease('v0.3.0', directory, key).authenticated, true);
    assert.equal(verifyRelease('v0.3.0', directory, key).bytes, bytes.length);
    for (const bad of [xml.replace('v0.3.0/', 'v0.4.0/'), xml.replace('length="25"', 'length="1"'), xml.replace('sparkle:os="macos"', 'sparkle:os="windows"'), xml.replace('0.3.0</sparkle:version>', '0.4.0</sparkle:version>'), xml.replace(sig, Buffer.alloc(64).toString('base64')), xml.replace('<item>', '<item><item>'), '<!DOCTYPE rss>' + xml]) {
      writeFileSync(join(directory, CONTRACT.appcast), bad);
      assert.throws(() => verifyRelease('v0.3.0', directory, key));
    }
    writeFileSync(join(directory, CONTRACT.appcast), xml);
    assert.throws(() => verifyRelease('v0.3.0-beta', directory, key));
    assert.throws(() => verifyRelease('v0.3.0', directory, Buffer.alloc(32).toString('base64')));
    writeFileSync(join(directory, CONTRACT.archive), 'tampered');
    assert.throws(() => verifyRelease('v0.3.0', directory, key), /Checksum/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
