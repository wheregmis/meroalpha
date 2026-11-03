import test from 'node:test';
import assert from 'node:assert/strict';
import { joinWaitlist, SUPABASE } from '../src/lib/waitlist.mjs';

test('waitlist sends a normalised address to join_waitlist', async () => {
  const calls = [];
  const reply = (status) => async (url, init) => (calls.push({ url, init }), { ok: status < 300, status });
  assert.equal(await joinWaitlist('  Me@Example.COM ', reply(204)), 'ok');
  assert.equal(calls[0].url, `${SUPABASE.url}/rest/v1/rpc/join_waitlist`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { address: 'me@example.com' });
  assert.equal(calls[0].init.headers.apikey, SUPABASE.key);
  assert.equal(await joinWaitlist('me@example.com', reply(400)), 'error');
  assert.equal(await joinWaitlist('me@example.com', reply(500)), 'error');
  assert.equal(await joinWaitlist('me@example.com', async () => { throw new TypeError('offline'); }), 'error');
});

test('waitlist rejects bad addresses without a request', async () => {
  const never = async () => assert.fail('no request');
  for (const bad of ['', 'nope', 'a@b', 'a b@c.d', `${'x'.repeat(250)}@e.com`, null]) assert.equal(await joinWaitlist(bad, never), 'invalid');
});
