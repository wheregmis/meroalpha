import test from 'node:test';
import assert from 'node:assert/strict';
import { initNavigation } from '../src/scripts/navigation.mjs';

function fixture(matches = true) {
  function element() {
    const attrs = new Map();
    return Object.assign(new EventTarget(), {
      hidden: false,
      setAttribute: (key, value) => attrs.set(key, value),
      getAttribute: (key) => attrs.get(key),
      hasAttribute: (key) => attrs.has(key),
      focus() { document.activeElement = this; },
    });
  }
  const doc = Object.assign(new EventTarget(), { activeElement: null });
  const media = Object.assign(new EventTarget(), { matches });
  const win = Object.assign(new EventTarget(), { matchMedia: () => media });
  globalThis.document = doc;
  globalThis.window = win;
  const root = element(), button = element(), panel = element(), link = element();
  panel.contains = (node) => node === link;
  panel.querySelector = () => link;
  root.contains = (node) => [root, button, panel, link].includes(node);
  root.querySelector = (selector) => selector === '.nav__toggle' ? button : panel;
  initNavigation(root);
  return { root, button, panel, link, doc, win, media };
}
test('mobile disclosure starts closed and toggles repeatedly; initialization is idempotent', () => {
  const f = fixture();
  assert.equal(f.panel.hidden, true);
  assert.equal(f.button.hidden, false);
  initNavigation(f.root);
  for (let i = 0; i < 3; i++) {
    f.button.dispatchEvent(new Event('click'));
    assert.equal(f.panel.hidden, false);
    assert.equal(f.button.getAttribute('aria-expanded'), 'true');
    f.button.dispatchEvent(new Event('click'));
    assert.equal(f.panel.hidden, true);
  }
});
test('Escape closes the panel and restores trigger focus', () => {
  const f = fixture();
  f.button.dispatchEvent(new Event('click'));
  f.link.focus();
  const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
  f.root.dispatchEvent(event);
  assert.equal(f.panel.hidden, true);
  assert.equal(f.doc.activeElement, f.button);
  assert.equal(event.defaultPrevented, true);
});
test('desktop/mobile transitions never leave hidden focus or stale open state', () => {
  const f = fixture(false);
  assert.equal(f.panel.hidden, false);
  assert.equal(f.button.hidden, true);
  f.link.focus();
  f.media.matches = true;
  f.media.dispatchEvent(new Event('change'));
  assert.equal(f.panel.hidden, true);
  assert.equal(f.doc.activeElement, f.button);
  f.button.dispatchEvent(new Event('click'));
  f.media.matches = false;
  f.media.dispatchEvent(new Event('change'));
  assert.equal(f.panel.hidden, false);
  assert.equal(f.button.getAttribute('aria-expanded'), 'false');
  assert.equal(f.doc.activeElement, f.link);
  f.media.matches = true;
  f.media.dispatchEvent(new Event('change'));
  assert.equal(f.panel.hidden, true);
});
test('page restoration closes a previously open mobile panel', () => {
  const f = fixture();
  f.button.dispatchEvent(new Event('click'));
  f.win.dispatchEvent(new Event('pageshow'));
  assert.equal(f.panel.hidden, true);
});
test('focus leaving the header dismisses without stealing focus', () => {
  const f = fixture();
  f.button.dispatchEvent(new Event('click'));
  const outside = new EventTarget();
  f.doc.activeElement = outside;
  f.doc.dispatchEvent(new Event('focusin'));
  assert.equal(f.panel.hidden, true);
  assert.equal(f.doc.activeElement, outside);
});
test('link selection closes the panel without preventing native navigation', () => {
  const f = fixture();
  f.button.dispatchEvent(new Event('click'));
  f.link.focus();
  const event = new Event('click', { cancelable: true });
  Object.defineProperty(event, 'target', { value: { closest: () => f.link } });
  f.panel.dispatchEvent(event);
  assert.equal(f.panel.hidden, true);
  assert.equal(event.defaultPrevented, false);
  assert.equal(f.doc.activeElement, f.button);
});
test('outside pointer dismisses and rescues focus from the hidden panel', () => {
  const f = fixture();
  f.button.dispatchEvent(new Event('click'));
  f.link.focus();
  f.doc.dispatchEvent(new Event('pointerdown'));
  assert.equal(f.panel.hidden, true);
  assert.equal(f.doc.activeElement, f.button);
});

test('mobile fallback scrolls away; stickiness requires successful navigation initialization', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');
  const mobile = css.slice(css.indexOf('@media (max-width: 50rem)'), css.indexOf('@media (max-width: 40rem)'));
  // Stylesheet contract rather than a browser layout assertion. The fallback's
  // 60px brand + four 48px links + CTA exceeds a 320px landscape viewport.
  assert.match(mobile, /\.masthead\s*\{[^}]*position:\s*relative\s*;/);
  assert.match(mobile, /\.masthead:has\(\.nav\[data-ready\]\)\s*\{\s*position:\s*sticky\s*;/);
  assert.doesNotMatch(mobile, /\.masthead\s*\{[^}]*position:\s*sticky\s*;/);
  const f = fixture();
  assert.equal(f.root.hasAttribute('data-ready'), true);
  assert.equal(f.panel.hidden, true);
});

test('missing navigation controls never mark the expanded fallback ready', () => {
  let ready = false;
  const root = {
    querySelector: () => null,
    hasAttribute: () => false,
    setAttribute: () => { ready = true; },
  };
  initNavigation(root);
  assert.equal(ready, false);
});
