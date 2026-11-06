import test from 'node:test';
import assert from 'node:assert/strict';
import { joinWaitlist, mountWaitlist, SUPABASE } from '../src/lib/waitlist.mjs';

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

function fixture(address = 'me@example.com', website = '') {
  const node = (value = '') => ({ value, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; }, focus() { this.focused = true; } });
  const status = { id: 'waitlist-email-status', textContent: '', dataset: {} }, button = { disabled: true }, email = node(address);
  const form = { elements: { email, website: node(website) }, querySelector: (s) => (s === 'button' ? button : status), addEventListener(_, handler) { this.submit = () => handler({ preventDefault() {} }); }, reset() { email.value = ''; } };
  mountWaitlist({ querySelectorAll: () => [form] });
  return { form, status, button, email };
}

async function withFetch(stub, run) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { await run(); } finally { globalThis.fetch = original; }
}

test('a stalled request times out into the error message and keeps the address', async (t) => {
  const stall = new AbortController();
  t.mock.method(AbortSignal, 'timeout', (ms) => (assert.equal(ms, 15000), stall.signal));
  // Hangs until aborted, as a real fetch does.
  await withFetch((_, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))), async () => {
    const f = fixture();
    const submitted = f.form.submit();
    assert.equal(f.button.disabled, true);
    stall.abort();
    await submitted;
    assert.equal(f.status.dataset.state, 'error');
    assert.match(f.status.textContent, /went wrong/);
    assert.equal(f.button.disabled, false);
    assert.equal(f.email.value, 'me@example.com');
  });
});

test('a pending message replaces earlier status, and success resets the form', async () => {
  let respond;
  await withFetch(() => new Promise((resolve) => { respond = resolve; }), async () => {
    const f = fixture();
    f.status.textContent = 'earlier'; f.status.dataset.state = 'error';
    const submitted = f.form.submit();
    assert.equal(f.status.textContent, 'Adding your address…');
    assert.equal(f.status.dataset.state, 'pending');
    respond({ ok: true });
    await submitted;
    assert.equal(f.status.dataset.state, 'ok');
    assert.equal(f.email.value, '');
    assert.equal(f.button.disabled, false);
  });
});

test('an invalid address is tied to its field, and a later valid attempt clears that', async () => {
  await withFetch(async () => ({ ok: true }), async () => {
    const f = fixture('nope');
    await f.form.submit();
    assert.equal(f.status.dataset.state, 'invalid');
    assert.deepEqual(f.email.attrs, { 'aria-invalid': 'true', 'aria-describedby': 'waitlist-email-status' });
    assert.equal(f.email.focused, true);
    f.email.value = 'me@example.com';
    await f.form.submit();
    assert.equal(f.status.dataset.state, 'ok');
    assert.deepEqual(f.email.attrs, {});
  });
});

test('the honeypot answers like success without a request', async () => {
  await withFetch(async () => assert.fail('no request'), async () => {
    const f = fixture('me@example.com', 'bot');
    await f.form.submit();
    assert.match(f.status.textContent, /on the list/);
  });
});
