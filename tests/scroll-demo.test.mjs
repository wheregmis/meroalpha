import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('scroll demo scrubs both ways, batches frames and restores static reduced-motion states', async () => {
  const source = await readFile(new URL('../src/scripts/scroll-demo.mjs', import.meta.url), 'utf8');
  const question = 'Is NABIL worth a paper position this week?';
  const prompt = { textContent: question };
  const numbers = ['entry', 'stop', 'target', 'portfolio'].map((key) => ({ dataset: { demoNumber: key } }));
  const properties = new Map();
  const classes = new Set();
  const events = {};
  const frames = [];
  let geometryReads = 0;
  const reduced = { matches: false, addEventListener: (_, cb) => { events.motion = cb; } };
  const demo = {
    querySelector: () => prompt,
    querySelectorAll: () => numbers,
    style: { setProperty: (key, value) => properties.set(key, value) },
    classList: { toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key) },
    removeAttribute: () => properties.clear(),
    getBoundingClientRect: () => { geometryReads++; return { top: 1000 - window.scrollY }; },
    offsetHeight: 4000,
  };
  const window = {
    scrollY: 0, innerHeight: 800, matchMedia: () => reduced,
    addEventListener: (event, cb, options) => { events[event] = cb; if (event === 'scroll') assert.equal(options.passive, true); },
    requestAnimationFrame: (cb) => frames.push(cb),
  };
  runInNewContext(source, { window, document: { querySelector: () => demo } });
  const flush = () => { while (frames.length) frames.shift()(); };
  flush();
  assert.equal(properties.get('--p'), 0);
  assert.equal(prompt.textContent, '');
  window.scrollY = 1000 + 3200 * 0.065;
  events.scroll(); events.scroll(); events.scroll();
  assert.equal(frames.length, 1);
  flush();
  assert.equal(prompt.textContent, question.slice(0, Math.round(question.length / 2)));
  assert.equal(geometryReads, 1, 'scrolling never measures layout');
  window.scrollY = 10000;
  events.scroll(); flush();
  assert.equal(properties.get('--p'), 1);
  assert.equal(numbers[3].textContent, '102,180.00');
  assert.ok(classes.has('is-ended'));
  window.scrollY = 1100;
  events.scroll(); flush();
  assert.ok(prompt.textContent.length < question.length);
  assert.ok(!classes.has('is-ended'));
  reduced.matches = true;
  events.motion();
  assert.equal(prompt.textContent, question);
  assert.equal(numbers[0].textContent, '505.00');
  assert.equal(numbers[3].textContent, '102,180.00');
  assert.equal(properties.size, 0);
  assert.ok(!classes.has('is-scrubbing'));
  events.scroll();
  assert.equal(frames.length, 0);
  reduced.matches = false;
  events.motion(); flush();
  assert.ok(classes.has('is-scrubbing'));
  window.innerHeight = 600;
  events.resize(); flush();
  assert.equal(properties.get('--p'), 100 / 3400);
});
