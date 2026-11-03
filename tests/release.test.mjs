import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtureArchive } from './release-fixture.mjs';
import { CONTRACT, verifyRelease } from '../scripts/verify-release.mjs';
test('release contract authenticates bytes and rejects mismatched metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'meroalpha-contract-'));
  try {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const key = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
    const bytes = fixtureArchive('0.3.0', { publicKey: key });
    const sig = sign(null, bytes, privateKey).toString('base64');
    const xml = `<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel><item><sparkle:version>0.3.0</sparkle:version><sparkle:shortVersionString>0.3.0</sparkle:shortVersionString><sparkle:minimumSystemVersion>14.0</sparkle:minimumSystemVersion><enclosure url="https://github.com/wheregmis/meroalpha/releases/download/v0.3.0/${CONTRACT.archive}" length="${bytes.length}" type="application/octet-stream" sparkle:edSignature="${sig}" sparkle:os="macos" /></item></channel></rss>`;
    writeFileSync(join(directory, CONTRACT.archive), bytes);
    writeFileSync(join(directory, CONTRACT.checksum), `${createHash('sha256').update(bytes).digest('hex')}  ${CONTRACT.archive}\n`);
    assert.equal(verifyRelease('v0.3.0', directory).authenticated, false);
    assert.throws(() => verifyRelease('v0.3.0', directory, key), /requires an appcast/);
    writeFileSync(join(directory, CONTRACT.appcast), xml);
    assert.throws(() => verifyRelease('v0.3.0', directory), /Trusted/);
    assert.equal(verifyRelease('v0.3.0', directory, key).authenticated, true);
    assert.equal(verifyRelease('v0.3.0', directory, key).bytes, bytes.length);
    for (const bad of [xml.replace('v0.3.0/', 'v0.4.0/'), xml.replace(`length="${bytes.length}"`, 'length="1"'), xml.replace('sparkle:os="macos"', 'sparkle:os="windows"'), xml.replace('0.3.0</sparkle:version>', '0.4.0</sparkle:version>'), xml.replace(sig, Buffer.alloc(64).toString('base64')), xml.replace('<item>', '<item><item>'), '<!DOCTYPE rss>' + xml, xml.replace(/<enclosure[^>]+\/>/, '<!--$&-->'), xml.replace(/url="([^"]+)"/, "url='https://example.invalid/wrong.zip' data-url=\"$1\""), xml.replace('http://www.andymatuschak.org/xml-namespaces/sparkle', 'https://example.invalid/namespace')]) {
      writeFileSync(join(directory, CONTRACT.appcast), bad);
      assert.throws(() => verifyRelease('v0.3.0', directory, key));
    }
    writeFileSync(join(directory, CONTRACT.appcast), xml.replace(/url="([^"]+)"/, "url='$1'"));
    assert.equal(verifyRelease('v0.3.0', directory, key).authenticated, true);
    writeFileSync(join(directory, CONTRACT.appcast), xml.replace('<channel>', '<channel><!-- <enclosure url="https://example.invalid/comment"/> -->'));
    assert.equal(verifyRelease('v0.3.0', directory, key).authenticated, true);
    writeFileSync(join(directory, CONTRACT.appcast), xml);
    assert.throws(() => verifyRelease('v0.3.0-beta', directory, key));
    assert.throws(() => verifyRelease('v0.3.0', directory, Buffer.alloc(32).toString('base64')));
    writeFileSync(join(directory, CONTRACT.archive), 'tampered');
    assert.throws(() => verifyRelease('v0.3.0', directory, key), /Checksum/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});


test('manual artifacts must contain the requested app version and supported platform', () => {
  const directory = mkdtempSync(join(tmpdir(), 'meroalpha-manual-contract-'));
  try {
    for (const [version, options] of [['0.2.0', {}], ['0.3.0', { id: 'com.example.wrong' }], ['0.3.0', { cpu: 0x01000007 }], ['0.3.0', { unsafe: true }]]) {
      const bytes = fixtureArchive(version, options);
      writeFileSync(join(directory, CONTRACT.archive), bytes);
      writeFileSync(join(directory, CONTRACT.checksum), `${createHash('sha256').update(bytes).digest('hex')}  ${CONTRACT.archive}\n`);
      assert.throws(() => verifyRelease('v0.3.0', directory));
    }
    const bytes = fixtureArchive('0.3.0', { build: '1' });
    writeFileSync(join(directory, CONTRACT.archive), bytes);
    writeFileSync(join(directory, CONTRACT.checksum), `${createHash('sha256').update(bytes).digest('hex')}  ${CONTRACT.archive}\n`);
    assert.equal(verifyRelease('v0.3.0', directory).authenticated, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
