import test from 'node:test';
import assert from 'node:assert/strict';
import { joinWaitlist, SUPABASE } from '../src/lib/waitlist.mjs';

test('waitlist posts a normalised address and hides whether it was already there', async () => {
  const calls = [];
  const reply = (status) => async (url, init) => (calls.push({ url, init }), { ok: status < 300, status });
  assert.equal(await joinWaitlist('  Me@Example.COM ', reply(201)), 'ok');
  assert.equal(calls[0].url, `${SUPABASE.url}/rest/v1/waitlist`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { email: 'me@example.com', product: 'agent' });
  assert.equal(calls[0].init.headers.apikey, SUPABASE.key);
  assert.equal(await joinWaitlist('me@example.com', reply(409)), 'ok');
  assert.equal(await joinWaitlist('me@example.com', reply(500)), 'error');
  assert.equal(await joinWaitlist('me@example.com', async () => { throw new TypeError('offline'); }), 'error');
});

test('waitlist rejects bad addresses without a request', async () => {
  const never = async () => assert.fail('no request');
  for (const bad of ['', 'nope', 'a@b', 'a b@c.d', `${'x'.repeat(250)}@e.com`, null]) assert.equal(await joinWaitlist(bad, never), 'invalid');
});
