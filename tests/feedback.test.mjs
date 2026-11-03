import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeedback, submitFeedback, mountFeedback } from '../src/lib/feedback.mjs';

const valid = { category: 'feedback', email: '', message: 'A synthetic product idea.' };
test('validation normalizes input and requires reply details only for questions', () => {
  assert.deepEqual(validateFeedback({ ...valid, email: ' Me@Example.TEST ', message: '  A synthetic product idea.  ' }), { data: { ...valid, email: 'me@example.test' }, errors: {} });
  assert.deepEqual(validateFeedback(valid).errors, {});
  assert.ok(validateFeedback({ ...valid, category: 'question' }).errors.email);
  assert.deepEqual(validateFeedback({ ...valid, category: 'question', email: 'me@example.test' }).errors, {});
  for (const category of ['unknown', null, "feedback'); drop table site_feedback;--"]) assert.ok(validateFeedback({ ...valid, category }).errors.category);
  for (const email of ['invalid', 'a b@c.test', 'x'.repeat(255) + '@e.test']) assert.ok(validateFeedback({ ...valid, email }).errors.email);
  for (const message of ['', 'short', 'x'.repeat(4001), null]) assert.ok(validateFeedback({ ...valid, message }).errors.message);
  assert.deepEqual(validateFeedback({ ...valid, message: 'नमस्ते '.repeat(100) }).errors, {});
  assert.ok(validateFeedback({ ...valid, message: '😀'.repeat(5) }).errors.message);
  assert.deepEqual(validateFeedback({ ...valid, message: '😀'.repeat(4000) }).errors, {});
  assert.ok(validateFeedback({ ...valid, message: '😀'.repeat(4001) }).errors.message);
});

test('transport sends only bounded user fields and a stable id, treats retries identically', async () => {
  const calls = [];
  const id = '00000000-0000-4000-8000-000000000001';
  const fetcher = async (url, init) => { calls.push({ url, init }); return { ok: true }; };
  assert.equal(await submitFeedback({ ...valid, secret: 'discard' }, id, '', fetcher), 'ok');
  assert.equal(await submitFeedback(valid, id, '', fetcher), 'ok');
  assert.equal(calls[0].url.endsWith('/rest/v1/rpc/submit_site_feedback'), true);
  assert.deepEqual(JSON.parse(calls[0].init.body), { ...valid, request_id: id, website: '' });
  assert.equal(calls[0].init.body, calls[1].init.body);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.equal(await submitFeedback({ ...valid, message: '' }, id, '', () => assert.fail('no request')), 'invalid');
});

test('network, backend and quota errors stay generic without reflecting content', async () => {
  for (const fetcher of [async () => { throw Error('private content'); }, async () => ({ ok: false, json: async () => { throw Error('invalid json'); } }), async () => ({ ok: false, json: async () => ({ code: '22023', message: '<script>private</script>' }) })]) assert.equal(await submitFeedback(valid, 'id', '', fetcher), 'error');
  assert.equal(await submitFeedback(valid, 'id', '', async () => ({ ok: false, json: async () => ({ code: 'P0001' }) })), 'limited');
});

function fixture() {
  const events = {}, nodes = {};
  const node = () => ({ value: '', textContent: '', dataset: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, v) { this[k] = v; }, focus() { this.focused = true; } });
  const form = { ...node(), elements: Object.fromEntries(['category', 'email', 'message', 'website'].map(k => [k, node()])),
    querySelector(s) { return nodes[s] ||= node(); }, addEventListener(k, v) { events[k] = v; }, reset() { this.elements.message.value = ''; this.elements.email.value = ''; this.elements.category.value = 'feedback'; } };
  Object.entries(valid).forEach(([k,v]) => form.elements[k].value = v);
  form.querySelector('fieldset').disabled = true;
  return { form, nodes, events, doc: { querySelectorAll: () => [form] }, submit: () => events.submit({ preventDefault() {} }) };
}

test('form remains disabled until its submit handler is attached', () => {
  const f = fixture();
  const attach = f.form.addEventListener;
  f.form.addEventListener = (name, handler) => {
    assert.equal(f.nodes.fieldset.disabled, true);
    attach(name, handler);
  };
  mountFeedback(f.doc);
  assert.equal(typeof f.events.submit, 'function');
  assert.equal(f.nodes.fieldset.disabled, false);
});

test('form blocks double submit, preserves failed input, retries same ID and resets only on success', async () => {
  const original = globalThis.FormData;
  globalThis.FormData = class { constructor(form) { this.form = form; } *[Symbol.iterator]() { for (const [k,v] of Object.entries(this.form.elements)) yield [k,v.value]; } };
  try {
    const f = fixture(), calls = [];
    let resolve, n = 0;
    mountFeedback(f.doc, async (...args) => { calls.push(args); return new Promise(r => resolve = r); }, () => `id-${++n}`);
    const first = f.submit();
    assert.equal(f.nodes.fieldset.disabled, true);
    await f.submit(); assert.equal(calls.length, 1);
    resolve('error'); await first;
    assert.equal(f.form.elements.message.value, valid.message);
    assert.equal(f.nodes.fieldset.disabled, false);
    assert.equal(f.nodes.button.textContent, 'Try sending again');
    const retry = f.submit(); assert.equal(calls[0][1], calls[1][1]);
    resolve('limited'); await retry;
    f.form.elements.message.value += ' Changed.';
    const changed = f.submit(); assert.notEqual(calls[2][1], calls[1][1]);
    resolve('ok'); await changed;
    assert.equal(f.form.elements.message.value, '');
    assert.equal(f.nodes['[data-feedback-status]'].dataset.state, 'ok');
    Object.entries(calls[2][0]).forEach(([k,v]) => f.form.elements[k].value = v);
    const fresh = f.submit();
    assert.deepEqual(calls[3][0], calls[2][0]);
    assert.notEqual(calls[3][1], calls[2][1]);
    resolve('ok'); await fresh;
    f.form.elements.category.value = 'question'; f.form.elements.category.change();
    assert.equal(f.form.elements.email.required, true);
    await f.submit(); assert.equal(calls.length, 4);
    assert.equal(f.form.elements.email.attrs['aria-invalid'], 'true');
    assert.equal(f.form.elements.email.focused, true);
  } finally { globalThis.FormData = original; }
});
